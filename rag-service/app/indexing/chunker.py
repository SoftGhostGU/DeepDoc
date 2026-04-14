"""分块策略模块"""
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

from loguru import logger

from app.models import Chunk, ChunkType, Paragraph, Section


@dataclass
class ChunkResult:
    """分块结果"""
    chunks: list[Chunk]
    chunk_count: int
    section_chunks: int = 0
    paragraph_chunks: int = 0
    summary_chunks: int = 0
    sentence_chunks: int = 0


class BaseChunker(ABC):
    """分块策略抽象基类"""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    @abstractmethod
    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        """执行分块

        Args:
            sections: 章节列表
            paragraphs: 段落列表
            doc_id: 文档ID

        Returns:
            ChunkResult: 分块结果
        """
        pass


class HierarchicalChunker(BaseChunker):
    """层级分块策略 - 按章节/段落分块，保持与 Section 的绑定"""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        """层级分块"""
        chunks: list[Chunk] = []
        section_chunks = 0
        paragraph_chunks = 0

        # 1. 章节级分块（含摘要）
        for section in sections:
            section_text = self._merge_paragraphs(section.paragraphs)
            if section_text:
                chunks.append(Chunk(
                    id=f"{doc_id}_sec_{section.id}",
                    doc_id=doc_id,
                    content=section_text,
                    chunk_type=ChunkType.SECTION,
                    section_id=section.id,
                    page_numbers=[section.start_page],
                    position=len(chunks),
                    char_count=len(section_text),
                ))
                section_chunks += 1

            # 2. 段落级分块
            for para in section.paragraphs:
                if para.content and len(para.content) >= 50:  # 最小段落长度
                    chunks.append(Chunk(
                        id=f"{doc_id}_para_{para.id}",
                        doc_id=doc_id,
                        content=para.content,
                        chunk_type=ChunkType.PARAGRAPH,
                        section_id=section.id,
                        page_numbers=[para.page],
                        position=len(chunks),
                        char_count=para.char_count,
                    ))
                    paragraph_chunks += 1

        logger.info(
            f"Hierarchical chunking: {len(chunks)} chunks, "
            f"sections={section_chunks}, paragraphs={paragraph_chunks}"
        )

        return ChunkResult(
            chunks=chunks,
            chunk_count=len(chunks),
            section_chunks=section_chunks,
            paragraph_chunks=paragraph_chunks,
        )

    def _merge_paragraphs(self, paragraphs: list[Paragraph]) -> str:
        """合并段落文本"""
        return " ".join(p.content for p in paragraphs if p.content)


class NaiveChunker(BaseChunker):
    """朴素分块策略 - 固定长度分块"""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        """固定长度分块"""
        chunks: list[Chunk] = []
        buffer: list[str] = []
        buffer_size = 0
        chunk_idx = 0
        paragraph_chunks = 0

        for para in paragraphs:
            if not para.content:
                continue

            para_size = para.char_count

            # 段落太长，拆分
            if para_size > self.chunk_size:
                if buffer:
                    chunk = self._create_chunk(doc_id, buffer, chunk_idx)
                    chunks.append(chunk)
                    buffer = []
                    buffer_size = 0
                    chunk_idx += 1
                    paragraph_chunks += 1

                # 递归拆分长段落
                sub_chunks = self._split_long_para(para, doc_id, chunk_idx)
                chunks.extend(sub_chunks)
                chunk_idx += len(sub_chunks)
                paragraph_chunks += len(sub_chunks)
                continue

            # 尝试添加到当前块
            if buffer_size + para_size > self.chunk_size:
                if buffer:
                    chunk = self._create_chunk(doc_id, buffer, chunk_idx)
                    chunks.append(chunk)
                    paragraph_chunks += 1

                    # 处理重叠
                    if self.chunk_overlap > 0:
                        overlap = self._get_overlap_text(buffer)
                        buffer = [overlap]
                        buffer_size = len(overlap)
                    else:
                        buffer = []
                        buffer_size = 0

                    chunk_idx += 1

            buffer.append(para.content)
            buffer_size += para_size

        # 保存最后一个块
        if buffer:
            chunk = self._create_chunk(doc_id, buffer, chunk_idx)
            chunks.append(chunk)
            paragraph_chunks += 1

        logger.info(f"Naive chunking: {len(chunks)} chunks created")

        return ChunkResult(
            chunks=chunks,
            chunk_count=len(chunks),
            paragraph_chunks=paragraph_chunks,
        )

    def _create_chunk(self, doc_id: str, content: list[str], idx: int) -> Chunk:
        """创建分块"""
        text = " ".join(content)
        return Chunk(
            id=f"{doc_id}_naive_{idx}",
            doc_id=doc_id,
            content=text,
            chunk_type=ChunkType.PARAGRAPH,
            position=idx,
            char_count=len(text),
        )

    def _get_overlap_text(self, buffer: list[str]) -> str:
        """获取重叠文本"""
        if len(buffer) <= 1:
            return buffer[0] if buffer else ""

        # 取最后几个元素
        overlap_size = min(self.chunk_overlap, sum(len(t) for t in buffer[-3:]))
        text = buffer[-1]
        for t in reversed(buffer[:-1]):
            if overlap_size <= 0:
                break
            text = t + " " + text
            overlap_size -= len(t)

        return text[: self.chunk_overlap * 5]  # 近似处理

    def _split_long_para(self, para: Paragraph, doc_id: str, start_idx: int) -> list[Chunk]:
        """拆分长段落"""
        words = para.content.split()
        chunks: list[Chunk] = []

        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk_words = words[i:i + self.chunk_size]
            text = " ".join(chunk_words)
            chunks.append(Chunk(
                id=f"{doc_id}_naive_{start_idx + i}",
                doc_id=doc_id,
                content=text,
                chunk_type=ChunkType.SENTENCE,
                section_id=para.section_id,
                page_numbers=[para.page],
                position=start_idx + len(chunks),
                char_count=len(text),
            ))

        return chunks


class SemanticChunker(BaseChunker):
    """语义分块策略 - 基于句子边界"""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        """语义分块"""
        import re

        chunks: list[Chunk] = []
        sentence_end = re.compile(r"[。！？\.\!\?]")
        sentence_chunks = 0

        for para in paragraphs:
            sentences = sentence_end.split(para.content)
            current_chunk: list[str] = []
            current_size = 0

            for sent in sentences:
                sent = sent.strip()
                if not sent:
                    continue

                if current_size + len(sent) > self.chunk_size:
                    if current_chunk:
                        text = "".join(current_chunk)
                        chunks.append(Chunk(
                            id=f"{doc_id}_sem_{len(chunks)}",
                            doc_id=doc_id,
                            content=text,
                            chunk_type=ChunkType.SENTENCE,
                            section_id=para.section_id,
                            page_numbers=[para.page],
                            position=len(chunks),
                            char_count=current_size,
                        ))
                        sentence_chunks += 1

                    current_chunk = [sent]
                    current_size = len(sent)
                else:
                    current_chunk.append(sent)
                    current_size += len(sent)

            # 保存最后一块
            if current_chunk:
                text = "".join(current_chunk)
                chunks.append(Chunk(
                    id=f"{doc_id}_sem_{len(chunks)}",
                    doc_id=doc_id,
                    content=text,
                    chunk_type=ChunkType.SENTENCE,
                    section_id=para.section_id,
                    page_numbers=[para.page],
                    position=len(chunks),
                    char_count=current_size,
                ))
                sentence_chunks += 1

        logger.info(f"Semantic chunking: {len(chunks)} chunks created")

        return ChunkResult(
            chunks=chunks,
            chunk_count=len(chunks),
            sentence_chunks=sentence_chunks,
        )


# ==================== 多粒度分块 ====================


class MultiGranularityChunker:
    """多粒度分块器 - 同时生成 detail 和 summary 向量"""

    def __init__(self):
        self.hierarchical = HierarchicalChunker()
        self.naive = NaiveChunker()

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> list[Chunk]:
        """生成多粒度分块

        返回的 chunks 包含:
        - detail 向量 (granularity='detail'): 原始段落
        - summary 向量 (granularity='summary'): 章节摘要
        """
        chunks: list[Chunk] = []

        # 1. Detail 级别 - 层级分块
        result = await self.hierarchical.chunk(sections, paragraphs, doc_id)

        for chunk in result.chunks:
            chunk.granularity = "detail"  # type: ignore
            chunks.append(chunk)

        # 2. Summary 级别 - 章节摘要
        for section in sections:
            if section.paragraphs:
                summary_text = self._generate_summary(section)
                if summary_text:
                    chunks.append(Chunk(
                        id=f"{doc_id}_sum_{section.id}",
                        doc_id=doc_id,
                        content=summary_text,
                        chunk_type=ChunkType.SECTION,
                        section_id=section.id,
                        granularity="summary",  # type: ignore
                        page_numbers=[section.start_page],
                        position=len(chunks),
                        char_count=len(summary_text),
                    ))

        return chunks

    def _generate_summary(self, section: Section) -> str:
        """生成章节摘要（抽取式）"""
        if not section.paragraphs:
            return ""

        # 取前2个段落的核心句
        key_sentences = []
        for para in section.paragraphs[:2]:
            sentences = para.content.split("。")
            if sentences:
                key_sentences.append(sentences[0].strip())

        return "。".join(key_sentences) + "。" if key_sentences else ""