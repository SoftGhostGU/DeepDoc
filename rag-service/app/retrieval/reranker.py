"""重排器 - 基于 cross-encoder 的重排序"""
from loguru import logger
from typing import Optional

from app.retrieval.base import RetrievalResult


class Reranker:
    _instance: Optional["Reranker"] = None

    def __init__(self):
        self._model = None
        self._model_loaded = False

    @classmethod
    def get_instance(cls) -> "Reranker":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def _load_model(self):
        if self._model_loaded:
            return
        try:
            from sentence_transformers import CrossEncoder
            import asyncio

            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None,
                lambda: CrossEncoder("BAAI/bge-reranker-v2-m3"),
            )
            self._model_loaded = True
            logger.info("Reranker model loaded: bge-reranker-v2-m3")
        except Exception as e:
            logger.warning(f"Failed to load reranker model, using fallback scoring: {e}")
            self._model = None
            self._model_loaded = True

    async def rerank(
        self,
        query: str,
        results: list[RetrievalResult],
        top_k: int = 5,
    ) -> list[RetrievalResult]:
        if not results:
            return []

        await self._load_model()

        if self._model is not None:
            return await self._rerank_with_model(query, results, top_k)

        return self._rerank_fallback(results, top_k)

    async def _rerank_with_model(
        self,
        query: str,
        results: list[RetrievalResult],
        top_k: int,
    ) -> list[RetrievalResult]:
        import asyncio
        import numpy as np

        pairs = [(query, r.content) for r in results]

        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            None,
            self._model.predict,
            pairs,
        )

        max_score = max(scores) if len(scores) > 0 else 1.0

        scored_results = []
        for result, score in zip(results, scores):
            normalized = float(score / max_score) if max_score > 0 else 0.0
            scored_results.append(result.model_copy(update={
                "score": normalized,
                "source": "reranked",
            }))

        scored_results.sort(key=lambda r: r.score, reverse=True)
        return scored_results[:top_k]

    def _rerank_fallback(
        self,
        results: list[RetrievalResult],
        top_k: int,
    ) -> list[RetrievalResult]:
        results.sort(key=lambda r: r.score, reverse=True)
        return [r.model_copy(update={"source": "reranked"}) for r in results[:top_k]]
