"""SSE 事件流封装"""
import json
import time
from typing import AsyncIterator, Optional

from loguru import logger

from app.retrieval.hierarchical import HierarchicalRetriever
from app.retrieval.naive import NaiveRetriever
from app.generation.generator import Generator
from app.generation.citation_extractor import extract_citations
from app.retrieval.base import RetrievalResult
from app.text_normalization import normalize_extracted_text


def sse_event(event_type: str, data: dict) -> str:
    payload = {"event": event_type, "data": data}
    return f"event: {event_type}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


class SSEStreamer:
    def __init__(self):
        self.generator = Generator()

    async def stream_response(
        self,
        query: str,
        doc_id: str,
        mode: str = "hierarchical",
        history: Optional[list[dict]] = None,
        rewrite_options: Optional[dict] = None,
        doc_ids: Optional[list[str]] = None,
    ) -> AsyncIterator[str]:
        try:
            t_start = time.time()
            yield sse_event("stage", {"stage": "analyzing", "message": "正在分析问题..."})

            is_multi_doc = doc_ids and len(doc_ids) > 1
            effective_query = query
            multi_queries = None

            if rewrite_options:
                if rewrite_options.get("enable_hyde"):
                    t_rewrite = time.time()
                    yield sse_event("stage", {"stage": "rewriting", "message": "正在使用 HyDE 改写查询..."})
                    from app.rewriting.hyde import HyDERewriter
                    hyde = HyDERewriter()
                    hyde_result = await hyde.rewrite(query)
                    logger.info(f"HyDE rewrite took {time.time() - t_rewrite:.3f}s")
                    if hyde_result:
                        effective_query = hyde_result

                if rewrite_options.get("multi_query"):
                    t_multi = time.time()
                    yield sse_event("stage", {"stage": "rewriting", "message": "正在生成多角度查询..."})
                    from app.rewriting.multi_query import MultiQueryRewriter
                    multi = MultiQueryRewriter()
                    multi_queries = await multi.rewrite(query)
                    logger.info(f"Multi-query rewrite took {time.time() - t_multi:.3f}s")

            t_retrieve = time.time()
            yield sse_event("stage", {"stage": "retrieving_summary", "message": "正在检索摘要层..."})

            if is_multi_doc:
                from app.retrieval.multi_doc import MultiDocRetriever
                multi = MultiDocRetriever()
                paragraph_results, retrieval_path = await multi.retrieve(
                    effective_query, doc_ids, mode=mode
                )
                section_results = []
                for r in paragraph_results[:5]:
                    section_results.append(r)
                yield sse_event("retrieval_summary", {
                    "chunks": [_result_to_chunk(r) for r in section_results],
                })
            elif mode == "naive":
                naive = NaiveRetriever()
                if multi_queries and len(multi_queries) > 1:
                    paragraph_results, retrieval_path = await self._multi_query_naive(naive, multi_queries, doc_id)
                else:
                    paragraph_results, retrieval_path = await naive.retrieve(effective_query, doc_id)
                section_results = []
                yield sse_event("retrieval_summary", {"chunks": []})
            else:
                hier = HierarchicalRetriever()
                if multi_queries and len(multi_queries) > 1:
                    section_results, paragraph_results, retrieval_path = await self._multi_query_hierarchical(hier, multi_queries, doc_id)
                else:
                    section_results, paragraph_results, retrieval_path = await hier.retrieve(effective_query, doc_id)
                yield sse_event("retrieval_summary", {
                    "chunks": [_result_to_chunk(r) for r in section_results],
                })

            yield sse_event("stage", {"stage": "retrieving_paragraphs", "message": "正在检索段落层..."})
            yield sse_event("retrieval_paragraphs", {
                "paragraphs": [_result_to_paragraph(r, idx) for idx, r in enumerate(paragraph_results)],
            })
            logger.info(f"Retrieval took {time.time() - t_retrieve:.3f}s")

            t_generate = time.time()
            yield sse_event("stage", {"stage": "generating", "message": "正在生成答案..."})

            full_answer = ""
            async for token in self.generator.generate_stream(query, paragraph_results, history):
                full_answer += token
                yield sse_event("token", {"stage": "generating", "token": token})

            logger.info(f"Generation took {time.time() - t_generate:.3f}s")

            citations = await extract_citations(full_answer, paragraph_results, doc_id)

            from app.scoring.credibility import CredibilityScorer
            scorer = CredibilityScorer()
            citations = await scorer.score(full_answer, citations, paragraph_results)

            logger.info(f"Total SSE stream took {time.time() - t_start:.3f}s")

            yield sse_event("final", {
                "answer": full_answer,
                "citations": citations,
                "retrieval_path": retrieval_path,
            })

        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield sse_event("error", {"message": f"生成回答时出错: {str(e)}"})

    async def _multi_query_naive(
        self,
        naive: NaiveRetriever,
        queries: list[str],
        doc_id: str,
    ) -> tuple[list[RetrievalResult], list[dict]]:
        from app.retrieval.fusion import rrf_fuse
        all_results = []
        for q in queries:
            results, _ = await naive.retrieve(q, doc_id)
            all_results.append(results)

        merged = rrf_fuse(all_results) if len(all_results) > 1 else all_results[0] if all_results else []
        path = [{"stage": "rewriting", "message": f"多查询融合 {len(queries)} 个子查询"}]
        return merged, path

    async def _multi_query_hierarchical(
        self,
        hier: HierarchicalRetriever,
        queries: list[str],
        doc_id: str,
    ) -> tuple[list[RetrievalResult], list[RetrievalResult], list[dict]]:
        from app.retrieval.fusion import rrf_fuse
        all_section = []
        all_paragraph = []
        for q in queries:
            secs, paras, _ = await hier.retrieve(q, doc_id)
            all_section.append(secs)
            all_paragraph.append(paras)

        merged_sections = rrf_fuse(all_section) if len(all_section) > 1 else all_section[0] if all_section else []
        merged_paragraphs = rrf_fuse(all_paragraph) if len(all_paragraph) > 1 else all_paragraph[0] if all_paragraph else []
        path = [{"stage": "rewriting", "message": f"多查询融合 {len(queries)} 个子查询"}]
        return merged_sections, merged_paragraphs, path


def _result_to_chunk(r: RetrievalResult) -> dict:
    return {
        "id": r.chunk_id,
        "text": normalize_extracted_text(r.content)[:200],
        "score": round(r.score, 4),
        "path": [r.section_id or "未知章节"],
    }


def _resolve_paragraph_index(r: RetrievalResult, fallback_index: int) -> int:
    if isinstance(r.paragraph_index, int):
        return r.paragraph_index

    meta_index = r.metadata.get("paragraph_index") if isinstance(r.metadata, dict) else None
    if isinstance(meta_index, int):
        return meta_index

    # Retrieval may not provide a document-level paragraph index; fallback to
    # a 1-based rank within the current retrieval result list.
    return fallback_index + 1


def _result_to_paragraph(r: RetrievalResult, fallback_index: int) -> dict:
    return {
        "id": r.chunk_id,
        "node_id": r.section_id,
        "page": r.page,
        "index": _resolve_paragraph_index(r, fallback_index),
        "text": normalize_extracted_text(r.content)[:200],
        "score": round(r.score, 4),
    }
