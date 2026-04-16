"""Prompt 模板管理"""
from app.retrieval.base import RetrievalResult


def build_rag_prompt(
    query: str,
    chunks: list[RetrievalResult],
    history: list[dict] | None = None,
    lang: str = "zh",
) -> str:
    if lang == "zh":
        return _build_zh_prompt(query, chunks, history)
    return _build_en_prompt(query, chunks, history)


def build_compare_prompt(
    query: str,
    chunks: list[RetrievalResult],
    mode: str = "hierarchical",
) -> str:
    mode_desc = "层级检索" if mode == "hierarchical" else "朴素检索"
    context = _format_chunks(chunks)

    return f"""你是一个专业的文档问答助手。当前使用的是「{mode_desc}」模式。

请基于以下检索到的内容回答问题。在回答中使用 [1], [2] 等标记引用对应的检索结果。

检索内容：
{context}

问题：{query}

请给出详细、准确的回答："""


def _build_zh_prompt(query: str, chunks: list[RetrievalResult], history: list[dict] | None) -> str:
    context = _format_chunks(chunks)

    history_text = ""
    if history:
        for msg in history[-6:]:
            role = "用户" if msg.get("role") == "user" else "助手"
            history_text += f"{role}: {msg.get('content', '')}\n"

    system = """你是一个专业的文档问答助手。你的任务是基于给定的检索内容回答用户问题。

规则：
1. 只基于检索到的内容回答，不要编造信息
2. 使用 [1], [2], [3] 等标注引用对应的检索结果
3. 如果检索内容不足以回答问题，请明确说明
4. 回答要准确、简洁、有条理
"""

    prompt = f"{system}\n\n检索内容：\n{context}\n"

    if history_text:
        prompt += f"\n对话历史：\n{history_text}\n"

    prompt += f"\n问题：{query}\n\n回答："
    return prompt


def _build_en_prompt(query: str, chunks: list[RetrievalResult], history: list[dict] | None) -> str:
    context = _format_chunks(chunks)

    system = """You are a professional document QA assistant. Answer based on the retrieved content.

Rules:
1. Only answer based on the retrieved content
2. Use [1], [2], [3] to cite corresponding results
3. If content is insufficient, say so clearly
"""

    return f"{system}\n\nRetrieved content:\n{context}\n\nQuestion: {query}\n\nAnswer:"


def _format_chunks(chunks: list[RetrievalResult]) -> str:
    if not chunks:
        return "（未检索到相关内容）"

    parts = []
    for i, chunk in enumerate(chunks, 1):
        section = chunk.section_id or "未知章节"
        parts.append(f"[{i}] (章节: {section}, 相关度: {chunk.score:.2f})\n{chunk.content}")

    return "\n\n".join(parts)
