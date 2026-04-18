from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.indexing.builder import IndexBuilder
from app.indexing.chunker import HierarchicalChunker
from app.models import Chunk, ChunkType, Granularity, IndexStrategy, Paragraph, Section


def test_build_sections_assigns_paragraphs_by_page_when_section_id_missing():
    builder = IndexBuilder()

    sections_data = [
        {
            "id": "sec_1",
            "title": "Part 1",
            "level": 1,
            "parent_id": None,
            "start_page": 1,
            "end_page": 2,
            "summary": None,
        },
        {
            "id": "sec_2",
            "title": "Part 2",
            "level": 1,
            "parent_id": None,
            "start_page": 3,
            "end_page": 4,
            "summary": None,
        },
    ]
    paragraphs_data = [
        {
            "id": "p1",
            "content": "first paragraph",
            "page_numbers": [1],
            "position": 0,
            "section_id": None,
            "char_count": 15,
        },
        {
            "id": "p2",
            "content": "second paragraph",
            "page_numbers": [3],
            "position": 1,
            "section_id": None,
            "char_count": 16,
        },
    ]

    sections = builder._build_sections(sections_data, paragraphs_data)

    assert [paragraph.id for paragraph in sections[0].paragraphs] == ["p1"]
    assert [paragraph.id for paragraph in sections[1].paragraphs] == ["p2"]


@pytest.mark.asyncio
async def test_hierarchical_chunker_splits_long_section_content_by_chunk_size():
    chunker = HierarchicalChunker(chunk_size=80, chunk_overlap=20)
    paragraphs = [
        Paragraph(
            id="p1",
            content="A" * 60,
            page=1,
            position=0,
            section_id="sec_1",
            char_count=60,
            word_count=12,
        ),
        Paragraph(
            id="p2",
            content="B" * 60,
            page=1,
            position=1,
            section_id="sec_1",
            char_count=60,
            word_count=12,
        ),
        Paragraph(
            id="p3",
            content="C" * 60,
            page=1,
            position=2,
            section_id="sec_1",
            char_count=60,
            word_count=12,
        ),
    ]
    sections = [
        Section(
            id="sec_1",
            title="Section 1",
            level=1,
            parent_id=None,
            start_page=1,
            end_page=1,
            paragraphs=paragraphs,
        )
    ]

    result = await chunker.chunk(sections, paragraphs, "doc1")

    section_chunks = [chunk for chunk in result.chunks if chunk.chunk_type == ChunkType.SECTION]
    assert len(section_chunks) == 4
    assert all(chunk.char_count <= 80 for chunk in section_chunks)
    assert all(chunk.section_id == "sec_1" for chunk in section_chunks)
    assert [chunk.id for chunk in section_chunks] == [
        "doc1_sec_sec_1",
        "doc1_sec_sec_1_1",
        "doc1_sec_sec_1_2",
        "doc1_sec_sec_1_3",
    ]


@pytest.mark.asyncio
async def test_build_reads_raw_paragraph_chunks_and_does_not_delete_before_embedding_succeeds():
    builder = IndexBuilder()
    request = SimpleNamespace(strategies=[IndexStrategy.HIERARCHICAL])

    raw_paragraphs = [
        {
            "id": "p1",
            "content": "raw paragraph",
            "page_numbers": [1],
            "position": 0,
            "section_id": "sec_1",
            "char_count": 200,
            "chunk_type": "paragraph",
            "granularity": "paragraph",
        }
    ]
    mock_embed_service = AsyncMock()
    mock_embed_service.encode = AsyncMock(side_effect=RuntimeError("EMBEDDING_UPSTREAM_ERROR: boom"))
    mock_qdrant = AsyncMock()
    mock_chunker = AsyncMock()
    mock_chunker.chunk = AsyncMock(
        return_value=SimpleNamespace(
            chunks=[
                Chunk(
                    id="doc1_sec_sec_1",
                    doc_id="doc1",
                    content="indexed section replacement",
                    chunk_type=ChunkType.SECTION,
                    granularity=Granularity.DETAIL,
                    section_id="sec_1",
                    page_numbers=[1],
                    position=0,
                    char_count=25,
                )
            ],
            chunk_count=1,
            section_chunks=1,
            paragraph_chunks=0,
            sentence_chunks=0,
        )
    )
    builder.chunkers = {request.strategies[0]: mock_chunker}

    get_chunks_mock = AsyncMock(return_value=raw_paragraphs)
    delete_index_chunks_mock = AsyncMock(return_value=1)

    with patch("app.indexing.builder.get_document", new=AsyncMock(return_value={"id": "doc1"})), patch(
        "app.indexing.builder.get_sections",
        new=AsyncMock(
            return_value=[
                {
                    "id": "sec_1",
                    "title": "Section 1",
                    "level": 1,
                    "parent_id": None,
                    "start_page": 1,
                    "end_page": 1,
                    "summary": None,
                }
            ]
        ),
    ), patch("app.indexing.builder.db_get_chunks", new=get_chunks_mock), patch(
        "app.indexing.builder.get_embedding_service",
        new=AsyncMock(return_value=mock_embed_service),
    ), patch("app.indexing.builder.get_qdrant_service", new=AsyncMock(return_value=mock_qdrant)), patch(
        "app.indexing.builder.delete_index_chunks",
        new=delete_index_chunks_mock,
    ):
        with pytest.raises(RuntimeError, match="EMBEDDING_UPSTREAM_ERROR"):
            await builder.build("doc1", request)

    assert get_chunks_mock.await_args_list[0].kwargs == {"chunk_type": "paragraph", "granularity": "paragraph"}
    assert delete_index_chunks_mock.await_count == 0
    assert mock_qdrant.replace_document_chunks.await_count == 0
