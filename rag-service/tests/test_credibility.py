"""Credibility scorer tests."""

from unittest.mock import AsyncMock, patch

import pytest

from app.scoring.credibility import CredibilityScorer


@pytest.mark.asyncio
async def test_score_awaits_embedding_service():
    scorer = CredibilityScorer()
    citations = [{"id": "c1", "text": "citation text", "score": 0.8}]

    mock_embed_service = AsyncMock()
    mock_embed_service.encode_one = AsyncMock(side_effect=[[1.0, 0.0], [1.0, 0.0]])

    with patch(
        "app.scoring.credibility.get_embedding_service",
        new=AsyncMock(return_value=mock_embed_service),
    ):
        scored = await scorer.score("answer text", citations, [])

    assert len(scored) == 1
    assert scored[0]["credibility"] > 0.0
    assert mock_embed_service.encode_one.await_count == 2
