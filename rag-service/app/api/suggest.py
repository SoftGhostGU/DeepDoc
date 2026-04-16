"""推荐问题接口"""
from fastapi import APIRouter
from loguru import logger
from pydantic import BaseModel

from app.core.config import get_settings
from app.generation.generator import Generator

router = APIRouter()

_SUGGEST_PROMPT = """你是一个专业的文档问答助手。请基于以下文档摘要/章节信息，生成 5 个用户可能感兴趣的推荐问题。
问题应该覆盖不同的角度和深度，从概览到细节。

文档信息：
{doc_info}

请以 JSON 数组格式输出推荐问题，例如：
["问题1", "问题2", "问题3", "问题4", "问题5"]

推荐问题："""


class SuggestRequest(BaseModel):
    doc_id: str


class SuggestResponse(BaseModel):
    doc_id: str
    questions: list[str]


@router.post("", response_model=SuggestResponse)
async def suggest(request: SuggestRequest) -> SuggestResponse:
    logger.info(f"Suggest request: doc_id={request.doc_id}")

    from app.core.database import get_document, get_sections

    doc = await get_document(request.doc_id)
    if not doc:
        return SuggestResponse(doc_id=request.doc_id, questions=[])

    sections = await get_sections(request.doc_id)

    doc_info = f"标题: {doc.get('title', '未知')}\n"
    if sections:
        section_titles = [f"  - {s['title']}" for s in sections[:10]]
        doc_info += "章节:\n" + "\n".join(section_titles)
    if doc.get("char_count"):
        doc_info += f"\n总字数: {doc['char_count']}"

    settings = get_settings()
    if not settings.llm_api_key:
        questions = _fallback_suggestions(doc, sections)
        return SuggestResponse(doc_id=request.doc_id, questions=questions)

    import json
    import httpx

    base_url = settings.llm_base_url.rstrip("/")
    url = f"{base_url}/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.llm_model,
        "messages": [{"role": "user", "content": _SUGGEST_PROMPT.format(doc_info=doc_info)}],
        "temperature": 0.7,
        "max_tokens": 512,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

        questions = _parse_questions(content)
        if not questions:
            questions = _fallback_suggestions(doc, sections)

        return SuggestResponse(doc_id=request.doc_id, questions=questions)
    except Exception as e:
        logger.error(f"Suggest LLM call failed: {e}")
        questions = _fallback_suggestions(doc, sections)
        return SuggestResponse(doc_id=request.doc_id, questions=questions)


def _parse_questions(text: str) -> list[str]:
    import json

    try:
        if "[" in text and "]" in text:
            start = text.index("[")
            end = text.rindex("]") + 1
            parsed = json.loads(text[start:end])
            if isinstance(parsed, list):
                return [str(q).strip() for q in parsed if str(q).strip()]
    except (json.JSONDecodeError, ValueError):
        pass

    lines = [line.strip().lstrip("0123456789.-) ") for line in text.split("\n") if line.strip()]
    return [l for l in lines if len(l) > 2][:5]


def _fallback_suggestions(doc: dict, sections: list[dict]) -> list[str]:
    title = doc.get("title", "文档")
    questions = [f"这篇文档的主要内容是什么？", f"{title}的核心观点有哪些？"]

    if sections:
        for s in sections[:3]:
            questions.append(f"请详细介绍「{s['title']}」的内容")

    return questions[:5]