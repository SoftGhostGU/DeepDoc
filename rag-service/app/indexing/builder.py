"""索引构建模块 - SQLite 向量存储"""
import time
from typing import Any, Optional

from app.core import get_settings, logger
from app.core.database import (
    delete_chunks,
    get_chunks as db_get_chunks,
    get_document,
    get_sections,
    optimize_db,
    save_chunks,
    save_index,
    save_sections,
)
from app.indexing.chunker import HierarchicalChunker, NaiveChunker, SemanticChunker
from app.indexing.summarizer import ExtractiveSummarizer
from app.models import (
    Chunk,
    ChunkType,
    Granularity,
    IndexRecord,
    IndexRequest,
    IndexResponse,
    IndexStats,
    IndexStrategy,
)
from app.services.embedding import get_embedding_service


class IndexBuilder:
    """索引构建器 - 使用 SQLite 存储向量"""

    def __init__(self):
        self.settings = get_settings()
        self.chunkers = {
            IndexStrategy.HIERARCHICAL: HierarchicalChunker(
                chunk_size=self.settings.chunk_size,
                chunk_overlap=self.settings.chunk_overlap,
            ),
            IndexStrategy.NAIVE: NaiveChunker(
                chunk_size=self.settings.chunk_size,
                chunk_overlap=self.settings.chunk_overlap,
            ),
            IndexStrategy.SEMANTIC: SemanticChunker(
                chunk_size=self.settings.chunk_size,
                chunk_overlap=self.settings.chunk_overlap,
            ),
        }
        self.summarizer = ExtractiveSummarizer()

    async def build(self, doc_id: str, request: IndexRequest) -> IndexResponse:
        """构建索引

        完整流程：
        1. 从数据库获取文档的 sections 和 paragraphs
        2. 执行分块
        3. 生成向量
        4. 事务保存到 SQLite
        5. 优化数据库
        """
        start_time = time.time()
        indices: list[IndexRecord] = []

        # 1. 获取文档数据
        doc = await get_document(doc_id)
        if not doc:
            raise ValueError(f"Document not found: {doc_id}")

        sections = await get_sections(doc_id)
        paragraphs = await db_get_chunks(doc_id, chunk_type="paragraph")  # 复用 chunk 表获取段落

        # 转换为 Section 和 Paragraph
        from app.models import Section, Paragraph
        section_objs = self._build_sections(sections, paragraphs)
        para_objs = self._build_paragraphs(paragraphs)

        # 2. 为每个策略构建索引
        for strategy in request.strategies:
            logger.info(f"Building index with strategy: {strategy}")

            chunker = self.chunkers.get(strategy)
            if not chunker:
                logger.warning(f"Unknown strategy: {strategy}, skipping")
                continue

            # 清空旧索引
            deleted = await delete_chunks(doc_id)
            logger.info(f"Deleted {deleted} old chunks")

            # 执行分块
            result = await chunker.chunk(section_objs, para_objs, doc_id)

            # 3. 生成向量并保存
            await self._embed_and_save(result.chunks, doc_id, strategy)

            # 4. 创建索引记录
            stats = IndexStats(
                total_chunks=result.chunk_count,
                section_chunks=result.section_chunks,
                paragraph_chunks=result.paragraph_chunks,
                sentence_chunks=result.sentence_chunks,
                index_size_bytes=sum(c.char_count for c in result.chunks),
                build_time_seconds=time.time() - start_time,
                embedding_model=self.settings.embedding_model,
            )

            record = IndexRecord(
                id=f"{doc_id}_{strategy.value}",
                doc_id=doc_id,
                strategy=strategy,
                chunk_type=self._get_chunk_type(strategy),
                chunk_count=result.chunk_count,
                status="ready",
                stats=stats,
            )

            # 保存索引记录
            await save_index({
                "id": record.id,
                "doc_id": record.doc_id,
                "collection_name": "chunks",
                "strategy": record.strategy.value,
                "chunk_type": record.chunk_type.value,
                "chunk_count": record.chunk_count,
                "status": record.status,
                "embedding_model": stats.embedding_model,
                "build_time_seconds": stats.build_time_seconds,
                "completed_at": time.time() - start_time,
            })

            indices.append(record)
            logger.info(f"Index built: {strategy.value}, chunks={result.chunk_count}")

        # 5. 优化数据库
        await optimize_db()

        build_time = time.time() - start_time

        return IndexResponse(
            doc_id=doc_id,
            indices=indices,
            build_time=build_time,
        )

    async def _embed_and_save(
        self,
        chunks: list[Chunk],
        doc_id: str,
        strategy: IndexStrategy,
    ) -> None:
        """生成向量并保存到 SQLite"""
        if not chunks:
            return

        # 获取嵌入服务
        embed_service = await get_embedding_service()

        # 批量生成向量（分批避免内存问题）
        batch_size = 32
        all_chunks_data = []

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.content for c in batch]

            # 生成向量
            embeddings = await embed_service.encode(texts, batch_size=batch_size)

            # 准备数据
            for chunk, embedding in zip(batch, embeddings):
                chunk_data = {
                    "id": chunk.id,
                    "doc_id": doc_id,
                    "section_id": chunk.section_id,
                    "content": chunk.content,
                    "chunk_type": chunk.chunk_type.value,
                    "granularity": chunk.granularity.value,
                    "position": chunk.position,
                    "page_numbers": chunk.page_numbers,
                    "char_count": chunk.char_count,
                    "embedding": embedding,
                }
                all_chunks_data.append(chunk_data)

        # 批量保存（事务）
        await save_chunks(all_chunks_data)

        logger.info(f"Saved {len(all_chunks_data)} chunks with embeddings")

    def _build_sections(self, sections_data: list[dict], paragraphs_data: list[dict]) -> list:
        """构建 Section 对象"""
        from app.models import Section, Paragraph

        sections = []
        for sec in sections_data:
            # 获取该章节的段落
            sec_paragraphs = [
                Paragraph(
                    id=p["id"],
                    content=p["content"],
                    page=p.get("page_numbers", [1])[0] if p.get("page_numbers") else 1,
                    position=p["position"],
                    section_id=sec["id"],
                    char_count=p["char_count"],
                    word_count=p["char_count"] // 5,  # 估算
                )
                for p in paragraphs_data
                if p.get("section_id") == sec["id"]
            ]

            section = Section(
                id=sec["id"],
                title=sec["title"],
                level=sec["level"],
                parent_id=sec.get("parent_id"),
                start_page=sec["start_page"],
                end_page=sec["end_page"],
                paragraphs=sec_paragraphs,
                summary=sec.get("summary"),
            )
            sections.append(section)

        return sections

    def _build_paragraphs(self, paragraphs_data: list[dict]) -> list:
        """构建 Paragraph 对象"""
        from app.models import Paragraph

        return [
            Paragraph(
                id=p["id"],
                content=p["content"],
                page=p.get("page_numbers", [1])[0] if p.get("page_numbers") else 1,
                position=p["position"],
                section_id=p.get("section_id"),
                char_count=p["char_count"],
                word_count=p["char_count"] // 5,
            )
            for p in paragraphs_data
        ]

    def _get_chunk_type(self, strategy: IndexStrategy) -> str:
        """获取主分块类型"""
        mapping = {
            IndexStrategy.HIERARCHICAL: "section",
            IndexStrategy.NAIVE: "paragraph",
            IndexStrategy.SEMANTIC: "sentence",
        }
        return mapping.get(strategy, "paragraph")


# ==================== 检索 ====================


async def search_similar(
    doc_id: str,
    query: str,
    top_k: int = 5,
    chunk_type: Optional[str] = None,
    granularity: Optional[str] = None,
) -> list[dict]:
    """相似检索（简单的余弦相似度）"""
    import numpy as np

    # 获取查询向量
    embed_service = await get_embedding_service()
    query_embedding = await embed_service.encode_one(query)

    # 获取文档的所有 chunks
    chunks = await db_get_chunks(
        doc_id,
        chunk_type=chunk_type,
        granularity=granularity,
    )

    if not chunks:
        return []

    # 计算相似度
    results = []
    query_vec = np.array(query_embedding)

    for chunk in chunks:
        if chunk.get("embedding") is None:
            continue

        chunk_vec = np.array(chunk["embedding"])
        similarity = np.dot(query_vec, chunk_vec)  # 已归一化，直接点积

        results.append({
            "chunk_id": chunk["id"],
            "content": chunk["content"],
            "chunk_type": chunk["chunk_type"],
            "granularity": chunk.get("granularity", "detail"),
            "section_id": chunk.get("section_id"),
            "score": float(similarity),
        })

    # 排序并返回 top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]