"""Chunking strategies for indexing."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from loguru import logger

from app.models import Chunk, ChunkType, Paragraph, Section


@dataclass
class ChunkResult:
    """Chunking result."""

    chunks: list[Chunk]
    chunk_count: int
    section_chunks: int = 0
    paragraph_chunks: int = 0
    summary_chunks: int = 0
    sentence_chunks: int = 0


class BaseChunker(ABC):
    """Base class for chunking strategies."""

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
        """Return chunks for a document."""


class HierarchicalChunker(BaseChunker):
    """Chunk by section and paragraph while keeping section bindings."""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        chunks: list[Chunk] = []
        section_chunks = 0
        paragraph_chunks = 0

        for section in sections:
            for split_index, (section_text, page_number) in enumerate(self._split_section_text(section)):
                chunk_id = (
                    f"{doc_id}_sec_{section.id}"
                    if split_index == 0
                    else f"{doc_id}_sec_{section.id}_{split_index}"
                )
                chunks.append(
                    Chunk(
                        id=chunk_id,
                        doc_id=doc_id,
                        content=section_text,
                        chunk_type=ChunkType.SECTION,
                        section_id=section.id,
                        page_numbers=[page_number],
                        position=len(chunks),
                        char_count=len(section_text),
                    )
                )
                section_chunks += 1

            for para in section.paragraphs:
                if para.content and len(para.content) >= 50:
                    chunks.append(
                        Chunk(
                            id=f"{doc_id}_para_{para.id}",
                            doc_id=doc_id,
                            content=para.content,
                            chunk_type=ChunkType.PARAGRAPH,
                            section_id=section.id,
                            page_numbers=[para.page],
                            position=len(chunks),
                            char_count=para.char_count,
                        )
                    )
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

    def _split_section_text(self, section: Section) -> list[tuple[str, int]]:
        section_text = self._merge_paragraphs(section.paragraphs)
        if not section_text:
            return []

        return [
            (part, section.start_page)
            for part in self._split_text(section_text)
        ]

    def _merge_paragraphs(self, paragraphs: list[Paragraph]) -> str:
        return " ".join(paragraph.content for paragraph in paragraphs if paragraph.content)

    def _split_text(self, text: str) -> list[str]:
        if len(text) <= self.chunk_size:
            return [text]

        step = max(1, self.chunk_size - self.chunk_overlap)
        return [text[i : i + self.chunk_size] for i in range(0, len(text), step)]


class NaiveChunker(BaseChunker):
    """Fixed-size chunking."""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        chunks: list[Chunk] = []
        buffer: list[str] = []
        buffer_size = 0
        chunk_idx = 0
        paragraph_chunks = 0

        for para in paragraphs:
            if not para.content:
                continue

            para_size = para.char_count

            if para_size > self.chunk_size:
                if buffer:
                    chunk = self._create_chunk(doc_id, buffer, chunk_idx)
                    chunks.append(chunk)
                    buffer = []
                    buffer_size = 0
                    chunk_idx += 1
                    paragraph_chunks += 1

                sub_chunks = self._split_long_para(para, doc_id, chunk_idx)
                chunks.extend(sub_chunks)
                chunk_idx += len(sub_chunks)
                paragraph_chunks += len(sub_chunks)
                continue

            if buffer_size + para_size > self.chunk_size:
                if buffer:
                    chunk = self._create_chunk(doc_id, buffer, chunk_idx)
                    chunks.append(chunk)
                    paragraph_chunks += 1

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
        if len(buffer) <= 1:
            return buffer[0] if buffer else ""

        overlap_size = min(self.chunk_overlap, sum(len(t) for t in buffer[-3:]))
        text = buffer[-1]
        for item in reversed(buffer[:-1]):
            if overlap_size <= 0:
                break
            text = item + " " + text
            overlap_size -= len(item)

        return text[: self.chunk_overlap * 5]

    def _split_long_para(self, para: Paragraph, doc_id: str, start_idx: int) -> list[Chunk]:
        words = para.content.split()
        chunks: list[Chunk] = []
        step = max(1, self.chunk_size - self.chunk_overlap)

        for i in range(0, len(words), step):
            chunk_words = words[i : i + self.chunk_size]
            text = " ".join(chunk_words)
            chunks.append(
                Chunk(
                    id=f"{doc_id}_naive_{start_idx + i}",
                    doc_id=doc_id,
                    content=text,
                    chunk_type=ChunkType.SENTENCE,
                    section_id=para.section_id,
                    page_numbers=[para.page],
                    position=start_idx + len(chunks),
                    char_count=len(text),
                )
            )

        return chunks


class SemanticChunker(BaseChunker):
    """Sentence-boundary chunking."""

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> ChunkResult:
        import re

        chunks: list[Chunk] = []
        sentence_end = re.compile(r"[。！？.\!\?]")
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
                        chunks.append(
                            Chunk(
                                id=f"{doc_id}_sem_{len(chunks)}",
                                doc_id=doc_id,
                                content=text,
                                chunk_type=ChunkType.SENTENCE,
                                section_id=para.section_id,
                                page_numbers=[para.page],
                                position=len(chunks),
                                char_count=current_size,
                            )
                        )
                        sentence_chunks += 1

                    current_chunk = [sent]
                    current_size = len(sent)
                else:
                    current_chunk.append(sent)
                    current_size += len(sent)

            if current_chunk:
                text = "".join(current_chunk)
                chunks.append(
                    Chunk(
                        id=f"{doc_id}_sem_{len(chunks)}",
                        doc_id=doc_id,
                        content=text,
                        chunk_type=ChunkType.SENTENCE,
                        section_id=para.section_id,
                        page_numbers=[para.page],
                        position=len(chunks),
                        char_count=current_size,
                    )
                )
                sentence_chunks += 1

        logger.info(f"Semantic chunking: {len(chunks)} chunks created")

        return ChunkResult(
            chunks=chunks,
            chunk_count=len(chunks),
            sentence_chunks=sentence_chunks,
        )


class MultiGranularityChunker:
    """Generate both detail and summary chunks."""

    def __init__(self):
        self.hierarchical = HierarchicalChunker()
        self.naive = NaiveChunker()

    async def chunk(
        self,
        sections: list[Section],
        paragraphs: list[Paragraph],
        doc_id: str,
    ) -> list[Chunk]:
        chunks: list[Chunk] = []

        result = await self.hierarchical.chunk(sections, paragraphs, doc_id)
        for chunk in result.chunks:
            chunk.granularity = "detail"  # type: ignore
            chunks.append(chunk)

        for section in sections:
            if section.paragraphs:
                summary_text = self._generate_summary(section)
                if summary_text:
                    chunks.append(
                        Chunk(
                            id=f"{doc_id}_sum_{section.id}",
                            doc_id=doc_id,
                            content=summary_text,
                            chunk_type=ChunkType.SECTION,
                            section_id=section.id,
                            granularity="summary",  # type: ignore
                            page_numbers=[section.start_page],
                            position=len(chunks),
                            char_count=len(summary_text),
                        )
                    )

        return chunks

    def _generate_summary(self, section: Section) -> str:
        if not section.paragraphs:
            return ""

        key_sentences: list[str] = []
        for para in section.paragraphs[:2]:
            sentences = para.content.split("。")
            if sentences:
                key_sentences.append(sentences[0].strip())

        return "。".join(key_sentences) + "。" if key_sentences else ""
