"""朴素检索器 - 不分层级的直接全文检索"""
from loguru import logger

from app.retrieval.base import RetrievalResult
from app.retrieval.dense_retriever import DenseRetriever
from app.retrieval.sparse_retriever import SparseRetriever
from app.retrieval.fusion import rrf_fuse
from app.retrieval.reranker import Reranker


class NaiveRetriever:
    def __init__(self):
        self.dense = DenseRetriever()
        self.sparse = SparseRetriever()
        self.reranker = Reranker.get_instance()

    async def retrieve(
        self,
        query: str,
        doc_id: str,
        top_k: int = 5,
        use_rerank: bool = True,
    ) -> tuple[list[RetrievalResult], list[dict]]:
        dense_results = await self.dense.search(query, doc_id, top_k=top_k * 3)
        sparse_results = await self.sparse.search(query, doc_id, top_k=top_k * 3)

        fused = rrf_fuse([dense_results, sparse_results])

        if use_rerank:
            fused = await self.reranker.rerank(query, fused, top_k=top_k)

        path = [
            {"stage": "analyzing", "message": "正在分析查询意图"},
            {"stage": "retrieving_paragraphs", "message": f"全文检索到 {len(fused)} 个段落"},
            {"stage": "generating", "message": "正在生成回答"},
        ]

        return fused, path
