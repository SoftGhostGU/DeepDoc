"""引用标注提取"""
import re
from typing import Optional

from app.retrieval.base import RetrievalResult
from app.core.database import get_sections


async def extract_citations(
    answer_text: str,
    context_chunks: list[RetrievalResult],
    doc_id: Optional[str] = None,
) -> list[dict]:
    refs = re.findall(r'\[(\d+)\]', answer_text)
    if not refs:
        return []

    sections_map = {}
    if doc_id:
        sections = await get_sections(doc_id)
        sections_map = {s["id"]: s for s in sections}

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

        section = sections_map.get(chunk.section_id or "", {})
        path = _build_path(chunk, section)

        citation = {
            "id": len(citations) + 1,
            "paragraph_id": chunk.chunk_id,
            "text": chunk.content[:200],
            "path": path,
            "score": round(chunk.score, 4),
        }

        if chunk.metadata.get("document_id"):
            citation["documentId"] = chunk.metadata["document_id"]
        if chunk.metadata.get("document_name"):
            citation["documentName"] = chunk.metadata["document_name"]

        citations.append(citation)

    return citations


def _build_path(chunk: RetrievalResult, section: dict) -> list[str]:
    path = []
    if section:
        if section.get("title"):
            path.append(section["title"])
    path.append(f"段落 {chunk.chunk_id}")
    return path
