"""密集检索器 - 基于 SQLite 向量存储的余弦相似度检索"""
import numpy as np
from loguru import logger
from typing import Optional

from app.retrieval.base import RetrievalResult, RetrieverBase
from app.services.embedding import get_embedding_service
from app.core.database import get_chunks as db_get_chunks


class DenseRetriever(RetrieverBase):
    def __init__(self):
        self._embed_service = None

    async def _ensure_embed_service(self):
        if self._embed_service is None:
            self._embed_service = await get_embedding_service()
        return self._embed_service

    async def search(
        self,
        query: str,
        doc_id: str,
        top_k: int = 5,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> list[RetrievalResult]:
        embed_service = await self._ensure_embed_service()
        query_vec = np.array(await embed_service.encode_one(query))

        chunks = await db_get_chunks(doc_id, chunk_type=chunk_type, granularity=granularity)
        if not chunks:
            logger.warning(f"No chunks found for doc_id={doc_id}, chunk_type={chunk_type}")
            return []

        results = []
        for chunk in chunks:
            embedding = chunk.get("embedding")
            if embedding is None:
                continue

            chunk_vec = np.array(embedding)
            norm_q = np.linalg.norm(query_vec)
            norm_c = np.linalg.norm(chunk_vec)
            if norm_q == 0 or norm_c == 0:
                continue

            similarity = float(np.dot(query_vec, chunk_vec) / (norm_q * norm_c))

            page_num = None
            page_numbers = chunk.get("page_numbers")
            if isinstance(page_numbers, list) and page_numbers:
                page_num = page_numbers[0]

            results.append(RetrievalResult(
                chunk_id=chunk["id"],
                content=chunk["content"],
                score=similarity,
                page=page_num,
                section_id=chunk.get("section_id"),
                chunk_type=chunk.get("chunk_type", "paragraph"),
                granularity=chunk.get("granularity", "detail"),
                source="dense",
            ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]
