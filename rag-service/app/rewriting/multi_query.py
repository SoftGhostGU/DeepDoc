"""多查询改写 — 生成多个不同角度的子查询"""
import json
from typing import Optional

import httpx
from loguru import logger

from app.core.config import get_settings


_MULTI_QUERY_PROMPT = """你是一个查询改写助手。请将以下用户问题改写为 3-5 个不同角度的子问题。
每个子问题应该从不同侧面探索原始问题的信息需求。

原始问题：{query}

请以 JSON 数组格式输出改写后的问题，例如：
["改写问题1", "改写问题2", "改写问题3"]

改写结果："""


class MultiQueryRewriter:
    def __init__(self):
        self.settings = get_settings()

    async def rewrite(self, query: str) -> list[str]:
        api_key = self.settings.llm_api_key
        if not api_key:
            logger.warning("No LLM API key configured, skipping multi-query rewrite")
            return [query]

        base_url = self.settings.llm_base_url.rstrip("/")
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.settings.llm_model,
            "messages": [{"role": "user", "content": _MULTI_QUERY_PROMPT.format(query=query)}],
            "temperature": 0.5,
            "max_tokens": 512,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()

                queries = _parse_queries(content)
                if queries:
                    all_queries = [query] + queries
                    logger.info(f"Multi-query rewrite: generated {len(queries)} sub-queries")
                    return all_queries
                return [query]
        except Exception as e:
            logger.error(f"Multi-query rewrite failed: {e}")
            return [query]


def _parse_queries(text: str) -> list[str]:
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
    if lines:
        return [l for l in lines if len(l) > 2]
    return []
