"""SSE response streaming helpers."""

import json
import time
from typing import AsyncIterator, Optional

from loguru import logger

from app.core.database import get_sections
from app.generation.citation_extractor import extract_citations
from app.generation.generator import Generator
from app.retrieval.base import RetrievalResult
from app.retrieval.hierarchical import HierarchicalRetriever
from app.retrieval.naive import NaiveRetriever
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

            is_multi_doc = bool(doc_ids and len(doc_ids) > 1)
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
                    yield sse_event("stage", {"stage": "rewriting", "message": "正在生成多视角查询..."})
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
                    effective_query,
                    doc_ids or [],
                    mode=mode,
                )
                section_results = paragraph_results[:5]
            elif mode == "naive":
                naive = NaiveRetriever()
                if multi_queries and len(multi_queries) > 1:
                    paragraph_results, retrieval_path = await self._multi_query_naive(
                        naive,
                        multi_queries,
                        doc_id,
                    )
                else:
                    paragraph_results, retrieval_path = await naive.retrieve(effective_query, doc_id)
                section_results = []
            else:
                hier = HierarchicalRetriever()
                if multi_queries and len(multi_queries) > 1:
                    section_results, paragraph_results, retrieval_path = await self._multi_query_hierarchical(
                        hier,
                        multi_queries,
                        doc_id,
                    )
                else:
                    section_results, paragraph_results, retrieval_path = await hier.retrieve(effective_query, doc_id)

            await _hydrate_result_context(
                [*section_results, *paragraph_results],
                fallback_doc_id=doc_id,
            )

            if is_multi_doc:
                yield sse_event(
                    "retrieval_summary",
                    {"chunks": [_result_to_chunk(result) for result in section_results]},
                )
            elif mode == "naive":
                yield sse_event("retrieval_summary", {"chunks": []})
            else:
                yield sse_event(
                    "retrieval_summary",
                    {"chunks": [_result_to_chunk(result) for result in section_results]},
                )

            yield sse_event("stage", {"stage": "retrieving_paragraphs", "message": "正在检索段落层..."})
            yield sse_event(
                "retrieval_paragraphs",
                {
                    "paragraphs": [
                        _result_to_paragraph(result, idx)
                        for idx, result in enumerate(paragraph_results)
                    ],
                },
            )
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

            yield sse_event(
                "final",
                {
                    "answer": full_answer,
                    "citations": citations,
                    "retrieval_path": retrieval_path,
                },
            )
        except Exception as exc:
            logger.error(f"SSE stream error: {exc}")
            yield sse_event("error", {"message": f"生成回答时出错: {str(exc)}"})

    async def _multi_query_naive(
        self,
        naive: NaiveRetriever,
        queries: list[str],
        doc_id: str,
    ) -> tuple[list[RetrievalResult], list[dict]]:
        from app.retrieval.fusion import rrf_fuse

        all_results = []
        for query in queries:
            results, _ = await naive.retrieve(query, doc_id)
            all_results.append(results)

        merged = rrf_fuse(all_results) if len(all_results) > 1 else all_results[0] if all_results else []
        path = [{"stage": "rewriting", "message": f"多查询融合了 {len(queries)} 个子查询"}]
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
        for query in queries:
            sections, paragraphs, _ = await hier.retrieve(query, doc_id)
            all_section.append(sections)
            all_paragraph.append(paragraphs)

        merged_sections = rrf_fuse(all_section) if len(all_section) > 1 else all_section[0] if all_section else []
        merged_paragraphs = (
            rrf_fuse(all_paragraph) if len(all_paragraph) > 1 else all_paragraph[0] if all_paragraph else []
        )
        path = [{"stage": "rewriting", "message": f"多查询融合了 {len(queries)} 个子查询"}]
        return merged_sections, merged_paragraphs, path


def _result_to_chunk(result: RetrievalResult) -> dict:
    document_id = _get_result_document_id(result)
    document_name = _get_result_document_name(result)
    section_title = _get_result_section_title(result)
    section_key = _build_section_key(document_id, result.section_id)

    path = []
    if document_name:
        path.append(document_name)
    if section_title:
        path.append(section_title)
    elif result.section_id:
        path.append(result.section_id)

    payload = {
        "id": result.chunk_id,
        "text": normalize_extracted_text(result.content)[:200],
        "score": round(result.score, 4),
        "path": path or [result.section_id or "未知章节"],
        "sectionId": result.section_id,
    }
    if document_id:
        payload["documentId"] = document_id
    if document_name:
        payload["documentName"] = document_name
    if section_key:
        payload["sectionKey"] = section_key
    if section_title:
        payload["sectionTitle"] = section_title
    return payload


def _resolve_paragraph_index(result: RetrievalResult, fallback_index: int) -> int:
    if isinstance(result.paragraph_index, int):
        return result.paragraph_index

    meta_index = result.metadata.get("paragraph_index") if isinstance(result.metadata, dict) else None
    if isinstance(meta_index, int):
        return meta_index

    return fallback_index + 1


def _result_to_paragraph(result: RetrievalResult, fallback_index: int) -> dict:
    document_id = _get_result_document_id(result)
    document_name = _get_result_document_name(result)
    section_title = _get_result_section_title(result)
    section_key = _build_section_key(document_id, result.section_id)

    payload = {
        "id": result.chunk_id,
        "node_id": result.section_id,
        "page": result.page,
        "index": _resolve_paragraph_index(result, fallback_index),
        "text": normalize_extracted_text(result.content)[:200],
        "score": round(result.score, 4),
    }
    if document_id:
        payload["documentId"] = document_id
    if document_name:
        payload["documentName"] = document_name
    if section_key:
        payload["sectionKey"] = section_key
    if section_title:
        payload["sectionTitle"] = section_title
    return payload


def _get_result_document_id(result: RetrievalResult) -> Optional[str]:
    if not isinstance(result.metadata, dict):
        return None
    value = result.metadata.get("document_id")
    if isinstance(value, str) and value.strip():
        return value
    return None


def _get_result_document_name(result: RetrievalResult) -> Optional[str]:
    if not isinstance(result.metadata, dict):
        return None
    value = result.metadata.get("document_name")
    if isinstance(value, str) and value.strip():
        return value
    return None


def _get_result_section_title(result: RetrievalResult) -> Optional[str]:
    if not isinstance(result.metadata, dict):
        return None
    value = result.metadata.get("section_title")
    if isinstance(value, str) and value.strip():
        return value
    return None


def _build_section_key(document_id: Optional[str], section_id: Optional[str]) -> Optional[str]:
    if document_id and section_id:
        return f"{document_id}:{section_id}"
    return document_id or section_id


async def _hydrate_result_context(
    results: list[RetrievalResult],
    fallback_doc_id: Optional[str] = None,
) -> None:
    section_titles_by_doc: dict[str, dict[str, str]] = {}
    doc_ids: list[str] = []
    seen_doc_ids: set[str] = set()

    for result in results:
        if not isinstance(result.metadata, dict):
            result.metadata = {}

        if fallback_doc_id and not result.metadata.get("document_id"):
            result.metadata["document_id"] = fallback_doc_id

        document_id = _get_result_document_id(result)
        if not document_id or document_id in seen_doc_ids:
            continue

        seen_doc_ids.add(document_id)
        doc_ids.append(document_id)

    for document_id in doc_ids:
        sections = await get_sections(document_id)
        section_titles_by_doc[document_id] = {
            section["id"]: section["title"]
            for section in sections
            if section.get("id") and section.get("title")
        }

    for result in results:
        document_id = _get_result_document_id(result)
        if not document_id or not result.section_id:
            continue

        section_title = section_titles_by_doc.get(document_id, {}).get(result.section_id)
        if section_title and not result.metadata.get("section_title"):
            result.metadata["section_title"] = section_title
