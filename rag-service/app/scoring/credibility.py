"""引用可信度评分模块"""
import math
from typing import Optional

from loguru import logger

from app.core.config import get_settings
from app.retrieval.base import RetrievalResult


CREDIBILITY_RETRIEVAL_WEIGHT = 0.6
CREDIBILITY_CONSISTENCY_WEIGHT = 0.4


class CredibilityScorer:
    def __init__(
        self,
        retrieval_weight: float = CREDIBILITY_RETRIEVAL_WEIGHT,
        consistency_weight: float = CREDIBILITY_CONSISTENCY_WEIGHT,
    ):
        self.retrieval_weight = retrieval_weight
        self.consistency_weight = consistency_weight
        self._embedding_service = None

    def _get_embedding_service(self):
        if self._embedding_service is None:
            from app.services.embedding import EmbeddingService
            self._embedding_service = EmbeddingService.get_instance()
        return self._embedding_service

    async def score(
        self,
        answer: str,
        citations: list[dict],
        context_chunks: list[RetrievalResult],
    ) -> list[dict]:
        if not citations:
            return citations

        scored = []
        for citation in citations:
            retrieval_score = citation.get("score", 0.0)
            consistency_score = await self._compute_consistency(answer, citation, context_chunks)

            credibility = (
                self.retrieval_weight * min(max(retrieval_score, 0.0), 1.0)
                + self.consistency_weight * consistency_score
            )

            scored_citation = {**citation, "credibility": round(min(max(credibility, 0.0), 1.0), 4)}
            scored.append(scored_citation)

        return scored

    async def _compute_consistency(
        self,
        answer: str,
        citation: dict,
        context_chunks: list[RetrievalResult],
    ) -> float:
        try:
            embedding_service = self._get_embedding_service()
            answer_emb = embedding_service.encode_one(answer)
            cite_text = citation.get("text", "")
            if not cite_text:
                return 0.3
            cite_emb = embedding_service.encode_one(cite_text)

            dot = sum(a * b for a, b in zip(answer_emb, cite_emb))
            norm_a = math.sqrt(sum(a * a for a in answer_emb))
            norm_c = math.sqrt(sum(b * b for b in cite_emb))

            if norm_a == 0 or norm_c == 0:
                return 0.3

            similarity = dot / (norm_a * norm_c)
            return max(0.0, min(1.0, (similarity + 1.0) / 2.0))
        except Exception as e:
            logger.warning(f"Consistency computation failed: {e}")
            return 0.3