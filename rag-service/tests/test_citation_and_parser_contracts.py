from unittest.mock import patch

import pytest

from app.generation.citation_extractor import extract_citations
from app.generation.prompt_templates import build_rag_prompt
from app.parsing.pdf_parser import HeadingBlock, PDFParser, TextBlock
from app.retrieval.base import RetrievalResult
from app.text_normalization import normalize_extracted_text


def test_pdf_parser_build_structure_assigns_blocks_once_and_keeps_front_matter():
    parser = PDFParser()
    headings = [
        HeadingBlock(text="Section 1", level=1, page=1, y=20),
        HeadingBlock(text="Section 2", level=1, page=2, y=20),
    ]
    blocks = [
        TextBlock(text="Front matter", page=1, y=5),
        TextBlock(text="Alpha", page=1, y=30),
        TextBlock(text="Beta", page=2, y=10),
        TextBlock(text="Gamma", page=2, y=30),
        TextBlock(text="Delta", page=3, y=10),
    ]

    sections, paragraphs = parser._build_structure(headings, blocks, page_count=3)

    assert [section.id for section in sections] == ["sec_front_matter", "sec_1", "sec_2"]
    assert sections[0].title == "前置内容"
    assert [paragraph.content for paragraph in sections[0].paragraphs] == ["Front matter"]
    assert [paragraph.content for paragraph in sections[1].paragraphs] == ["Alpha", "Beta"]
    assert [paragraph.content for paragraph in sections[2].paragraphs] == ["Gamma", "Delta"]
    assert [paragraph.content for paragraph in paragraphs] == [
        "Front matter",
        "Alpha",
        "Beta",
        "Gamma",
        "Delta",
    ]
    assert len({paragraph.id for paragraph in paragraphs}) == 5
    assert sections[1].end_page == 2
    assert sections[2].end_page == 3


def test_build_rag_prompt_uses_normalized_chunk_content():
    dirty_content = f"(int)v.size(){chr(0xF358)}1LL << k"
    normalized_content = normalize_extracted_text(dirty_content)

    prompt = build_rag_prompt(
        "What should I watch out for?",
        [
            RetrievalResult(
                chunk_id="chunk-1",
                content=dirty_content,
                score=0.9,
                section_id="sec-1",
            )
        ],
    )

    assert normalized_content in prompt
    assert dirty_content not in prompt


@pytest.mark.asyncio
async def test_extract_citations_uses_each_chunk_document_sections_in_multi_doc_mode():
    retrieval_results = [
        RetrievalResult(
            chunk_id="doc_a_para_1",
            content="Alpha",
            score=0.91,
            page=3,
            section_id="sec-a",
            metadata={"document_id": "doc_a", "document_name": "Doc A"},
        ),
        RetrievalResult(
            chunk_id="doc_b_para_2",
            content="Beta",
            score=0.87,
            page=7,
            section_id="sec-b",
            metadata={"document_id": "doc_b", "document_name": "Doc B"},
        ),
    ]

    async def fake_get_sections(doc_id: str):
        if doc_id == "doc_a":
            return [{"id": "sec-a", "title": "Section A"}]
        if doc_id == "doc_b":
            return [{"id": "sec-b", "title": "Section B"}]
        return []

    with patch("app.generation.citation_extractor.get_sections", new=fake_get_sections):
        citations = await extract_citations("Answer [1] and [2]", retrieval_results, doc_id="doc_a")

    assert [citation["path"] for citation in citations] == [
        ["Section A", "段落 doc_a_para_1"],
        ["Section B", "段落 doc_b_para_2"],
    ]
