"""Dense retriever tests."""

from unittest.mock import AsyncMock, patch

import pytest

from app.retrieval.base import RetrievalResult
from app.retrieval.dense_retriever import DenseRetriever


@pytest.mark.asyncio
async def test_dense_search_returns_qdrant_ranked_results():
    mock_embed = AsyncMock()
    mock_embed.encode_one = AsyncMock(return_value=[0.1, 0.2, 0.3])

    mock_qdrant = AsyncMock()
    mock_qdrant.search = AsyncMock(
        return_value=[
            {"chunk_id": "c2", "score": 0.92, "payload": {}},
            {"chunk_id": "c1", "score": 0.81, "payload": {}},
        ]
    )

    chunk_map = {
        "c1": {
            "id": "c1",
            "content": "paragraph one",
            "section_id": "sec1",
            "chunk_type": "paragraph",
            "granularity": "detail",
            "page_numbers": [1],
        },
        "c2": {
            "id": "c2",
            "content": "paragraph two",
            "section_id": "sec2",
            "chunk_type": "paragraph",
            "granularity": "detail",
            "page_numbers": [2],
        },
    }

    with patch("app.retrieval.dense_retriever.get_embedding_service", new=AsyncMock(return_value=mock_embed)), patch(
        "app.retrieval.dense_retriever.get_qdrant_service", new=AsyncMock(return_value=mock_qdrant)
    ), patch("app.retrieval.dense_retriever.get_chunks_by_ids", new=AsyncMock(return_value=chunk_map)):
        retriever = DenseRetriever()
        results = await retriever.search("test query", "doc1", top_k=5, chunk_type="paragraph", granularity="detail")

    assert len(results) == 2
    assert all(isinstance(item, RetrievalResult) for item in results)
    assert [item.chunk_id for item in results] == ["c2", "c1"]
    assert results[0].score == pytest.approx(0.92)
    assert results[0].page == 2
    assert results[0].source == "dense"


@pytest.mark.asyncio
async def test_dense_search_returns_empty_when_no_hits():
    mock_embed = AsyncMock()
    mock_embed.encode_one = AsyncMock(return_value=[0.1, 0.2, 0.3])

    mock_qdrant = AsyncMock()
    mock_qdrant.search = AsyncMock(return_value=[])

    with patch("app.retrieval.dense_retriever.get_embedding_service", new=AsyncMock(return_value=mock_embed)), patch(
        "app.retrieval.dense_retriever.get_qdrant_service", new=AsyncMock(return_value=mock_qdrant)
    ), patch("app.retrieval.dense_retriever.get_chunks_by_ids", new=AsyncMock(return_value={})):
        retriever = DenseRetriever()
        results = await retriever.search("test query", "doc1")

    assert results == []
