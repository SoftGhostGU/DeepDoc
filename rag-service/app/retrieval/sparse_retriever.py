"""稀疏检索器 - 基于 BM25 的文本检索"""
import jieba
from loguru import logger
from rank_bm25 import BM25Okapi
from typing import Optional

from app.retrieval.base import RetrievalResult, RetrieverBase
from app.core.database import get_chunks as db_get_chunks


class SparseRetriever(RetrieverBase):
    def __init__(self):
        self._index_cache: dict[str, tuple[BM25Okapi, list[dict]]] = {}

    def _cache_key(self, doc_id: str, chunk_type: Optional[str], granularity: Optional[str]) -> str:
        return f"{doc_id}:{chunk_type or 'all'}:{granularity or 'all'}"

    def _tokenize(self, text: str) -> list[str]:
        return list(jieba.cut(text))

    async def build_index(
        self,
        doc_id: str,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> None:
        key = self._cache_key(doc_id, chunk_type, granularity)
        if key in self._index_cache:
            return

        chunks = await db_get_chunks(doc_id, chunk_type=chunk_type, granularity=granularity)
        if not chunks:
            logger.warning(f"No chunks for BM25 index: doc_id={doc_id}")
            return

        tokenized_corpus = [self._tokenize(c["content"]) for c in chunks]
        bm25 = BM25Okapi(tokenized_corpus)
        self._index_cache[key] = (bm25, chunks)
        logger.info(f"BM25 index built: {key}, corpus_size={len(chunks)}")

    async def search(
        self,
        query: str,
        doc_id: str,
        top_k: int = 5,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> list[RetrievalResult]:
        await self.build_index(doc_id, chunk_type, granularity)

        key = self._cache_key(doc_id, chunk_type, granularity)
        cached = self._index_cache.get(key)
        if not cached:
            return []

        bm25, chunks = cached
        tokenized_query = self._tokenize(query)
        scores = bm25.get_scores(tokenized_query)

        max_score = max(scores) if len(scores) > 0 and max(scores) > 0 else 1.0

        results = []
        for idx, score in enumerate(scores):
            chunk = chunks[idx]
            normalized = score / max_score if max_score > 0 else 0.0

            page_num = None
            page_numbers = chunk.get("page_numbers")
            if isinstance(page_numbers, list) and page_numbers:
                page_num = page_numbers[0]

            results.append(RetrievalResult(
                chunk_id=chunk["id"],
                content=chunk["content"],
                score=normalized,
                page=page_num,
                section_id=chunk.get("section_id"),
                chunk_type=chunk.get("chunk_type", "paragraph"),
                granularity=chunk.get("granularity", "detail"),
                source="sparse",
            ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]

    def clear_cache(self, doc_id: Optional[str] = None) -> None:
        if doc_id is None:
            self._index_cache.clear()
        else:
            keys_to_remove = [k for k in self._index_cache if k.startswith(f"{doc_id}:")]
            for k in keys_to_remove:
                del self._index_cache[k]
