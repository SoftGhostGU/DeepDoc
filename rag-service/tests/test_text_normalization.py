from unittest.mock import AsyncMock, patch

import pytest

from app.generation.citation_extractor import extract_citations
from app.parsing.pdf_parser import PDFParser
from app.retrieval.base import RetrievalResult


class _FakePage:
    def __init__(self, text_dict: dict):
        self._text_dict = text_dict

    def get_text(self, mode: str) -> dict:
        assert mode == "dict"
        return self._text_dict


def test_pdf_parser_normalizes_extracted_block_text():
    parser = PDFParser()
    doc = [
        _FakePage(
            {
                "blocks": [
                    {
                        "type": 0,
                        "bbox": (10, 20, 210, 60),
                        "lines": [
                            {
                                "spans": [
                                    {"text": "• (int)v.size()", "size": 10, "flags": 0},
                                    {"text": "", "size": 10, "flags": 0},
                                    {"text": "• 1LL << k", "size": 10, "flags": 0},
                                    {"text": "⽤全局变量", "size": 10, "flags": 0},
                                ]
                            }
                        ],
                    }
                ]
            }
        )
    ]

    blocks = parser._extract_text_blocks(doc)

    assert len(blocks) == 1
    assert blocks[0].text == "• (int)v.size() 2 • 1LL << k 用全局变量"


@pytest.mark.asyncio
async def test_extract_citations_includes_page_and_cleaned_text():
    retrieval_results = [
        RetrievalResult(
            chunk_id="doc_1_para_3",
            content="• (int)v.size() • 1LL << k • ⽤全局变量",
            score=0.88,
            page=19,
            section_id="sec-1",
        )
    ]

    with patch(
        "app.generation.citation_extractor.get_sections",
        new=AsyncMock(return_value=[{"id": "sec-1", "title": "算法注意事项"}]),
    ):
        citations = await extract_citations("答案 [1]", retrieval_results, doc_id="doc_1")

    assert len(citations) == 1
    assert citations[0]["page"] == 19
    assert citations[0]["path"] == ["算法注意事项", "段落 doc_1_para_3"]
    assert citations[0]["text"] == "• (int)v.size() 2 • 1LL << k • 用全局变量"
