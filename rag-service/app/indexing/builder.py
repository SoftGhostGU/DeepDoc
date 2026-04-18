"""Index building and dense search helpers."""

from __future__ import annotations

import time
from typing import Optional

from app.core import get_settings, logger
from app.core.database import (
    delete_index_chunks,
    get_chunks as db_get_chunks,
    get_document,
    get_sections,
    optimize_db,
    save_chunks,
    save_index,
)
from app.indexing.chunker import HierarchicalChunker, NaiveChunker, SemanticChunker
from app.models import (
    Chunk,
    IndexRecord,
    IndexRequest,
    IndexResponse,
    IndexStats,
    IndexStrategy,
)
from app.services.embedding import get_embedding_service
from app.services.qdrant_store import get_qdrant_service


class IndexBuilder:
    """Build indices and store dense vectors in Qdrant."""

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

    async def build(self, doc_id: str, request: IndexRequest) -> IndexResponse:
        start_time = time.time()
        indices: list[IndexRecord] = []

        doc = await get_document(doc_id)
        if not doc:
            raise ValueError(f"Document not found: {doc_id}")

        sections = await get_sections(doc_id)
        paragraphs = await db_get_chunks(doc_id, chunk_type="paragraph", granularity="paragraph")

        section_objs = self._build_sections(sections, paragraphs)
        para_objs = self._build_paragraphs(paragraphs)

        qdrant = await get_qdrant_service()

        for strategy in request.strategies:
            logger.info(f"Building index with strategy: {strategy}")

            chunker = self.chunkers.get(strategy)
            if not chunker:
                logger.warning(f"Unknown strategy: {strategy}, skipping")
                continue

            result = await chunker.chunk(section_objs, para_objs, doc_id)
            sqlite_chunks, qdrant_chunks = await self._prepare_index_chunks(result.chunks, doc_id)

            await qdrant.replace_document_chunks(doc_id, qdrant_chunks)
            deleted = await delete_index_chunks(doc_id)
            if sqlite_chunks:
                await save_chunks(sqlite_chunks)
            logger.info(
                f"Replaced {deleted} old indexed chunks and saved {len(sqlite_chunks)} new chunks for doc_id={doc_id}"
            )

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

            await save_index(
                {
                    "id": record.id,
                    "doc_id": record.doc_id,
                    "collection_name": self.settings.qdrant_collection,
                    "strategy": record.strategy.value,
                    "chunk_type": record.chunk_type.value,
                    "chunk_count": record.chunk_count,
                    "status": record.status,
                    "embedding_model": stats.embedding_model,
                    "build_time_seconds": stats.build_time_seconds,
                    "completed_at": time.time() - start_time,
                }
            )

            indices.append(record)
            logger.info(f"Index built: {strategy.value}, chunks={result.chunk_count}")

        await optimize_db()

        return IndexResponse(
            doc_id=doc_id,
            indices=indices,
            build_time=time.time() - start_time,
        )

    async def _prepare_index_chunks(self, chunks: list[Chunk], doc_id: str) -> tuple[list[dict], list[dict]]:
        sqlite_chunks: list[dict] = []
        qdrant_chunks: list[dict] = []

        if not chunks:
            return sqlite_chunks, qdrant_chunks

        embed_service = await get_embedding_service()
        batch_size = self.settings.embedding_batch_size or 32

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            texts = [chunk.content for chunk in batch]
            embeddings = await embed_service.encode(texts, batch_size=batch_size)

            for chunk, embedding in zip(batch, embeddings):
                granularity = (
                    chunk.granularity.value
                    if hasattr(chunk.granularity, "value")
                    else str(chunk.granularity)
                )
                chunk_type = (
                    chunk.chunk_type.value
                    if hasattr(chunk.chunk_type, "value")
                    else str(chunk.chunk_type)
                )

                sqlite_chunks.append(
                    {
                        "id": chunk.id,
                        "doc_id": doc_id,
                        "section_id": chunk.section_id,
                        "content": chunk.content,
                        "chunk_type": chunk_type,
                        "granularity": granularity,
                        "position": chunk.position,
                        "page_numbers": chunk.page_numbers,
                        "char_count": chunk.char_count,
                        "embedding": None,
                    }
                )
                qdrant_chunks.append(
                    {
                        "id": chunk.id,
                        "doc_id": doc_id,
                        "section_id": chunk.section_id,
                        "chunk_type": chunk_type,
                        "granularity": granularity,
                        "page_numbers": chunk.page_numbers,
                        "embedding": embedding,
                    }
                )

        return sqlite_chunks, qdrant_chunks

    def _build_sections(self, sections_data: list[dict], paragraphs_data: list[dict]) -> list:
        from app.models import Paragraph, Section

        sections = []
        for sec in sections_data:
            sec_paragraphs = [
                Paragraph(
                    id=p["id"],
                    content=p["content"],
                    page=p.get("page_numbers", [1])[0] if p.get("page_numbers") else 1,
                    position=p["position"],
                    section_id=sec["id"],
                    char_count=p["char_count"],
                    word_count=p["char_count"] // 5,
                )
                for p in paragraphs_data
                if self._paragraph_matches_section(p, sec)
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

    def _paragraph_matches_section(self, paragraph: dict, section: dict) -> bool:
        explicit_section_id = paragraph.get("section_id")
        if explicit_section_id:
            return explicit_section_id == section["id"]

        page_numbers = paragraph.get("page_numbers") or []
        page = page_numbers[0] if page_numbers else 1
        return section["start_page"] <= page <= section["end_page"]

    def _build_paragraphs(self, paragraphs_data: list[dict]) -> list:
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
        mapping = {
            IndexStrategy.HIERARCHICAL: "section",
            IndexStrategy.NAIVE: "paragraph",
            IndexStrategy.SEMANTIC: "sentence",
        }
        return mapping.get(strategy, "paragraph")


async def search_similar(
    doc_id: str,
    query: str,
    top_k: int = 5,
    chunk_type: Optional[str] = None,
    granularity: Optional[str] = None,
) -> list[dict]:
    """Run dense retrieval through Qdrant-backed retriever."""
    from app.retrieval.dense_retriever import DenseRetriever

    retriever = DenseRetriever()
    results = await retriever.search(
        query=query,
        doc_id=doc_id,
        top_k=top_k,
        chunk_type=chunk_type,
        granularity=granularity,
    )
    if not results and granularity == "summary":
        results = await retriever.search(
            query=query,
            doc_id=doc_id,
            top_k=top_k,
            chunk_type=chunk_type,
            granularity="detail",
        )
    return [
        {
            "chunk_id": item.chunk_id,
            "content": item.content,
            "chunk_type": item.chunk_type,
            "granularity": item.granularity,
            "section_id": item.section_id,
            "score": item.score,
        }
        for item in results
    ]
