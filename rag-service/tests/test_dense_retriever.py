"""Dense retriever tests"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, patch, MagicMock

from app.retrieval.dense_retriever import DenseRetriever
from app.retrieval.base import RetrievalResult


@pytest.fixture
def mock_chunks():
    return [
        {
            "id": "c1",
            "content": "层级检索先选取候选摘要",
            "embedding": np.random.randn(1024).tolist(),
            "chunk_type": "paragraph",
            "granularity": "detail",
            "section_id": "s1",
            "page_numbers": [1],
            "char_count": 10,
        },
        {
            "id": "c2",
            "content": "朴素检索直接全文匹配",
            "embedding": np.random.randn(1024).tolist(),
            "chunk_type": "paragraph",
            "granularity": "detail",
            "section_id": "s2",
            "page_numbers": [2],
            "char_count": 10,
        },
    ]


@pytest.mark.asyncio
async def test_dense_search_returns_results(mock_chunks):
    with patch("app.retrieval.dense_retriever.get_embedding_service") as mock_embed, \
         patch("app.retrieval.dense_retriever.db_get_chunks", new_callable=AsyncMock, return_value=mock_chunks):
        mock_svc = AsyncMock()
        mock_svc.encode_one.return_value = np.random.randn(1024).tolist()
        mock_embed.return_value = mock_svc

        retriever = DenseRetriever()
        results = await retriever.search("层级检索", "doc1", top_k=5)

        assert len(results) <= 2
        assert all(isinstance(r, RetrievalResult) for r in results)
        assert results[0].source == "dense"


@pytest.mark.asyncio
async def test_dense_search_empty_chunks():
    with patch("app.retrieval.dense_retriever.get_embedding_service") as mock_embed, \
         patch("app.retrieval.dense_retriever.db_get_chunks", new_callable=AsyncMock, return_value=[]):
        mock_svc = AsyncMock()
        mock_embed.return_value = mock_svc

        retriever = DenseRetriever()
        results = await retriever.search("test", "doc1")

        assert results == []
