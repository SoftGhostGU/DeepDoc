"""Sparse retriever tests"""
import pytest
from unittest.mock import AsyncMock, patch

from app.retrieval.sparse_retriever import SparseRetriever
from app.retrieval.base import RetrievalResult


@pytest.fixture
def mock_chunks():
    return [
        {
            "id": "c1",
            "content": "层级检索先选取候选摘要，再深入到相关段落进行精确溯源",
            "chunk_type": "paragraph",
            "granularity": "detail",
            "section_id": "s1",
            "page_numbers": [1],
            "char_count": 25,
        },
        {
            "id": "c2",
            "content": "朴素检索直接全文匹配，不利用层级结构",
            "chunk_type": "paragraph",
            "granularity": "detail",
            "section_id": "s2",
            "page_numbers": [2],
            "char_count": 18,
        },
    ]


@pytest.mark.asyncio
async def test_sparse_search_returns_results(mock_chunks):
    with patch("app.retrieval.sparse_retriever.db_get_chunks", new_callable=AsyncMock, return_value=mock_chunks):
        retriever = SparseRetriever()
        results = await retriever.search("层级检索", "doc1", top_k=5)

        assert len(results) <= 2
        assert all(isinstance(r, RetrievalResult) for r in results)
        assert results[0].source == "sparse"


@pytest.mark.asyncio
async def test_sparse_search_cache(mock_chunks):
    with patch("app.retrieval.sparse_retriever.db_get_chunks", new_callable=AsyncMock, return_value=mock_chunks):
        retriever = SparseRetriever()
        await retriever.search("层级", "doc1")
        await retriever.search("检索", "doc1")

        key = retriever._cache_key("doc1", None, None)
        assert key in retriever._index_cache


@pytest.mark.asyncio
async def test_sparse_clear_cache():
    retriever = SparseRetriever()
    retriever._index_cache["doc1:all:all"] = (None, [])
    retriever.clear_cache("doc1")
    assert "doc1:all:all" not in retriever._index_cache
