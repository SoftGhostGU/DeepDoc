"""Dense retriever backed by Qdrant."""

from __future__ import annotations

from typing import Optional

from loguru import logger

from app.core.database import get_chunks_by_ids
from app.retrieval.base import RetrievalResult, RetrieverBase
from app.services.embedding import get_embedding_service
from app.services.qdrant_store import get_qdrant_service


class DenseRetriever(RetrieverBase):
    def __init__(self):
        self._embed_service = None
        self._qdrant = None

    async def _ensure_embed_service(self):
        if self._embed_service is None:
            self._embed_service = await get_embedding_service()
        return self._embed_service

    async def _ensure_qdrant(self):
        if self._qdrant is None:
            self._qdrant = await get_qdrant_service()
        return self._qdrant

    async def search(
        self,
        query: str,
        doc_id: str,
        top_k: int = 5,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> list[RetrievalResult]:
        embed_service = await self._ensure_embed_service()
        qdrant = await self._ensure_qdrant()

        query_vector = await embed_service.encode_one(query)
        if not query_vector:
            return []

        hits = await qdrant.search(
            doc_id=doc_id,
            query_vector=query_vector,
            top_k=top_k,
            chunk_type=chunk_type,
            granularity=granularity,
        )
        if not hits:
            logger.warning(f"No dense hits for doc_id={doc_id}, chunk_type={chunk_type}, granularity={granularity}")
            return []

        ordered_chunk_ids = [hit["chunk_id"] for hit in hits if hit.get("chunk_id")]
        chunk_map = await get_chunks_by_ids(doc_id, ordered_chunk_ids)

        results: list[RetrievalResult] = []
        for hit in hits:
            chunk_id = hit["chunk_id"]
            chunk = chunk_map.get(chunk_id)
            if not chunk:
                continue

            page_num = None
            page_numbers = chunk.get("page_numbers")
            if isinstance(page_numbers, list) and page_numbers:
                page_num = page_numbers[0]

            results.append(
                RetrievalResult(
                    chunk_id=chunk_id,
                    content=chunk.get("content", ""),
                    score=float(hit["score"]),
                    page=page_num,
                    section_id=chunk.get("section_id"),
                    chunk_type=chunk.get("chunk_type", "paragraph"),
                    granularity=chunk.get("granularity", "detail"),
                    source="dense",
                )
            )

        return results[:top_k]
