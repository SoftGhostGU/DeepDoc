from unittest.mock import AsyncMock, patch

import pytest

from app.retrieval.base import RetrievalResult
from app.retrieval.hierarchical import HierarchicalRetriever


@pytest.mark.asyncio
async def test_retrieve_sections_falls_back_to_detail_when_summary_missing():
    retriever = HierarchicalRetriever()
    detail_results = [
        RetrievalResult(
            chunk_id="sec-1",
            content="section content",
            score=0.9,
            section_id="sec_1",
            chunk_type="section",
            granularity="detail",
            source="dense",
        )
    ]

    with patch.object(retriever.dense, "search", new=AsyncMock(side_effect=[[], detail_results])), patch.object(
        retriever.sparse,
        "search",
        new=AsyncMock(side_effect=[[], []]),
    ):
        results = await retriever._retrieve_sections("query", "doc_1", top_k=5)

    assert len(results) == 1
    assert results[0].section_id == "sec_1"
