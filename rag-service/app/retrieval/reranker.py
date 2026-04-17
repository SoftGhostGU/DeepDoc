"""Optional reranker based on sentence-transformers CrossEncoder."""

from __future__ import annotations

import asyncio
from typing import Optional

from loguru import logger

from app.core.config import get_settings
from app.retrieval.base import RetrievalResult


class Reranker:
    _instance: Optional["Reranker"] = None

    def __init__(self):
        self._model = None
        self._model_loaded = False
        self._enabled = get_settings().rerank_enabled

    @classmethod
    def get_instance(cls) -> "Reranker":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def _load_model(self) -> None:
        if self._model_loaded:
            return

        if not self._enabled:
            self._model_loaded = True
            logger.info("Reranker disabled by configuration")
            return

        try:
            from sentence_transformers import CrossEncoder

            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None,
                lambda: CrossEncoder("BAAI/bge-reranker-v2-m3"),
            )
            logger.info("Reranker model loaded: bge-reranker-v2-m3")
        except Exception as exc:
            logger.warning(f"Failed to load reranker model, fallback to original ranking: {exc}")
            self._model = None
        finally:
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

        if self._model is None:
            return self._rerank_fallback(results, top_k)

        return await self._rerank_with_model(query, results, top_k)

    async def _rerank_with_model(
        self,
        query: str,
        results: list[RetrievalResult],
        top_k: int,
    ) -> list[RetrievalResult]:
        pairs = [(query, item.content) for item in results]
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(None, self._model.predict, pairs)

        max_score = max(scores) if len(scores) > 0 else 1.0
        ranked: list[RetrievalResult] = []
        for item, score in zip(results, scores):
            normalized = float(score / max_score) if max_score > 0 else 0.0
            ranked.append(
                item.model_copy(
                    update={
                        "score": normalized,
                        "source": "reranked",
                    }
                )
            )

        ranked.sort(key=lambda value: value.score, reverse=True)
        return ranked[:top_k]

    def _rerank_fallback(self, results: list[RetrievalResult], top_k: int) -> list[RetrievalResult]:
        ranked = sorted(results, key=lambda item: item.score, reverse=True)
        return [item.model_copy(update={"source": "reranked"}) for item in ranked[:top_k]]
