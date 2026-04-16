"""多文档联合检索"""
from loguru import logger

from app.retrieval.base import RetrievalResult
from app.retrieval.dense_retriever import DenseRetriever
from app.retrieval.sparse_retriever import SparseRetriever
from app.retrieval.fusion import rrf_fuse
from app.retrieval.reranker import Reranker
from app.core.database import get_document


class MultiDocRetriever:
    def __init__(self):
        self.dense = DenseRetriever()
        self.sparse = SparseRetriever()
        self.reranker = Reranker.get_instance()

    async def retrieve(
        self,
        query: str,
        doc_ids: list[str],
        top_k: int = 5,
        mode: str = "hierarchical",
        use_rerank: bool = True,
    ) -> tuple[list[RetrievalResult], list[dict]]:
        all_results = []
        doc_names = {}

        for doc_id in doc_ids:
            doc = await get_document(doc_id)
            if doc:
                doc_names[doc_id] = doc.get("title", doc_id)
            else:
                doc_names[doc_id] = doc_id

            try:
                if mode == "hierarchical":
                    from app.retrieval.hierarchical import HierarchicalRetriever
                    hier = HierarchicalRetriever()
                    _, results, path = await hier.retrieve(query, doc_id)
                else:
                    from app.retrieval.naive import NaiveRetriever
                    naive = NaiveRetriever()
                    results, path = await naive.retrieve(query, doc_id)

                for r in results:
                    r.metadata["document_id"] = doc_id
                    r.metadata["document_name"] = doc_names.get(doc_id, doc_id)

                all_results.append(results)
            except Exception as e:
                logger.error(f"Failed to retrieve from doc {doc_id}: {e}")
                continue

        if not all_results:
            return [], []

        merged = rrf_fuse(all_results) if len(all_results) > 1 else all_results[0]

        if use_rerank:
            merged = await self.reranker.rerank(query, merged, top_k=top_k)

        path = [
            {"stage": "analyzing", "message": f"多文档联合检索 ({len(doc_ids)} 篇文档)"},
            {"stage": "retrieving_paragraphs", "message": f"跨文档检索到 {len(merged)} 个段落"},
            {"stage": "generating", "message": "正在生成回答"},
        ]

        return merged, path