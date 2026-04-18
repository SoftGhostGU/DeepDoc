"""Citation extraction helpers."""

import re
from typing import Optional

from app.core.database import get_sections
from app.retrieval.base import RetrievalResult
from app.text_normalization import normalize_extracted_text


async def extract_citations(
    answer_text: str,
    context_chunks: list[RetrievalResult],
    doc_id: Optional[str] = None,
) -> list[dict]:
    refs = re.findall(r"\[(\d+)\]", answer_text)
    if not refs:
        return []

    sections_by_doc = await _load_sections_by_doc(context_chunks, fallback_doc_id=doc_id)

    citations = []
    seen_ids = set()

    for ref_str in refs:
        idx = int(ref_str) - 1
        if idx < 0 or idx >= len(context_chunks):
            continue

        chunk = context_chunks[idx]
        if chunk.chunk_id in seen_ids:
            continue
        seen_ids.add(chunk.chunk_id)

        chunk_doc_id = _get_chunk_document_id(chunk, fallback_doc_id=doc_id)
        section = sections_by_doc.get(chunk_doc_id or "", {}).get(chunk.section_id or "", {})
        path = _build_path(chunk, section)

        citation = {
            "id": len(citations) + 1,
            "paragraph_id": chunk.chunk_id,
            "text": normalize_extracted_text(chunk.content)[:200],
            "path": path,
            "score": round(chunk.score, 4),
            "page": chunk.page,
        }

        if chunk.metadata.get("document_id"):
            citation["documentId"] = chunk.metadata["document_id"]
        if chunk.metadata.get("document_name"):
            citation["documentName"] = chunk.metadata["document_name"]

        citations.append(citation)

    return citations


def _build_path(chunk: RetrievalResult, section: dict) -> list[str]:
    path = []
    if section and section.get("title"):
        path.append(section["title"])
    path.append(f"段落 {chunk.chunk_id}")
    return path


def _get_chunk_document_id(
    chunk: RetrievalResult,
    fallback_doc_id: Optional[str] = None,
) -> Optional[str]:
    if isinstance(chunk.metadata, dict):
        metadata_doc_id = chunk.metadata.get("document_id")
        if isinstance(metadata_doc_id, str) and metadata_doc_id.strip():
            return metadata_doc_id
    return fallback_doc_id


async def _load_sections_by_doc(
    context_chunks: list[RetrievalResult],
    fallback_doc_id: Optional[str] = None,
) -> dict[str, dict[str, dict]]:
    doc_ids: list[str] = []
    seen: set[str] = set()

    for chunk in context_chunks:
        chunk_doc_id = _get_chunk_document_id(chunk, fallback_doc_id=fallback_doc_id)
        if not chunk_doc_id or chunk_doc_id in seen:
            continue
        seen.add(chunk_doc_id)
        doc_ids.append(chunk_doc_id)

    if fallback_doc_id and fallback_doc_id not in seen:
        doc_ids.append(fallback_doc_id)

    sections_by_doc: dict[str, dict[str, dict]] = {}
    for current_doc_id in doc_ids:
        sections = await get_sections(current_doc_id)
        sections_by_doc[current_doc_id] = {section["id"]: section for section in sections}

    return sections_by_doc
