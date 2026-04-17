"""两阶段层级检索器"""
from loguru import logger
from typing import Optional

from app.retrieval.base import RetrievalResult
from app.retrieval.dense_retriever import DenseRetriever
from app.retrieval.sparse_retriever import SparseRetriever
from app.retrieval.fusion import rrf_fuse
from app.retrieval.reranker import Reranker
from app.core.database import get_sections


class HierarchicalRetriever:
    def __init__(self):
        self.dense = DenseRetriever()
        self.sparse = SparseRetriever()
        self.reranker = Reranker.get_instance()
        self._last_section_results: list[RetrievalResult] = []
        self._last_paragraph_results: list[RetrievalResult] = []

    async def retrieve(
        self,
        query: str,
        doc_id: str,
        section_top_k: int = 10,
        paragraph_top_k: int = 5,
        final_top_k: int = 5,
        use_rerank: bool = True,
    ) -> tuple[list[RetrievalResult], list[RetrievalResult], list[dict]]:
        section_results = await self._retrieve_sections(query, doc_id, top_k=section_top_k)
        self._last_section_results = section_results

        candidate_section_ids = list({
            r.section_id for r in section_results if r.section_id
        })

        paragraph_results = await self._retrieve_paragraphs(
            query, doc_id, candidate_section_ids, top_k=paragraph_top_k,
        )

        if use_rerank:
            paragraph_results = await self.reranker.rerank(query, paragraph_results, top_k=final_top_k)

        self._last_paragraph_results = paragraph_results

        path = self._build_path(query, section_results, paragraph_results)

        return section_results, paragraph_results, path

    async def _retrieve_sections(
        self,
        query: str,
        doc_id: str,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        dense_results = await self.dense.search(query, doc_id, top_k=top_k, chunk_type="section", granularity="summary")
        sparse_results = await self.sparse.search(query, doc_id, top_k=top_k, chunk_type="section", granularity="summary")
        fused = rrf_fuse([dense_results, sparse_results])
        if fused:
            return fused

        dense_results = await self.dense.search(query, doc_id, top_k=top_k, chunk_type="section", granularity="detail")
        sparse_results = await self.sparse.search(query, doc_id, top_k=top_k, chunk_type="section", granularity="detail")
        return rrf_fuse([dense_results, sparse_results])

    async def _retrieve_paragraphs(
        self,
        query: str,
        doc_id: str,
        candidate_section_ids: list[str],
        top_k: int = 5,
    ) -> list[RetrievalResult]:
        dense_results = await self.dense.search(query, doc_id, top_k=top_k * 3, chunk_type="paragraph", granularity="detail")
        sparse_results = await self.sparse.search(query, doc_id, top_k=top_k * 3, chunk_type="paragraph", granularity="detail")

        all_results = rrf_fuse([dense_results, sparse_results])

        if candidate_section_ids:
            filtered = [r for r in all_results if r.section_id in candidate_section_ids]
            if filtered:
                return filtered

        return all_results

    def _build_path(
        self,
        query: str,
        section_results: list[RetrievalResult],
        paragraph_results: list[RetrievalResult],
    ) -> list[dict]:
        path = []
        stages = [
            {"stage": "analyzing", "message": "正在分析查询意图"},
            {"stage": "rewriting", "message": "正在改写查询"},
        ]

        if section_results:
            stages.append({
                "stage": "retrieving_summary",
                "message": f"检索到 {len(section_results)} 个候选章节",
            })

        if paragraph_results:
            stages.append({
                "stage": "retrieving_paragraphs",
                "message": f"精排到 {len(paragraph_results)} 个段落",
            })

        stages.append({"stage": "generating", "message": "正在生成回答"})

        for s in stages:
            path.append(s)

        return path
