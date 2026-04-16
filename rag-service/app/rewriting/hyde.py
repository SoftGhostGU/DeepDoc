"""HyDE (Hypothetical Document Embeddings) 查询改写"""
import json
from typing import Optional

import httpx
from loguru import logger

from app.core.config import get_settings


_HYDE_PROMPT = """请基于以下问题，生成一段详细的假设性回答。
回答应该包含可能出现在真实文档中的专业术语和具体细节。
不要说"我不确定"或"根据文档"，直接给出假设性的专业回答。

问题：{query}

假设性回答："""


class HyDERewriter:
    def __init__(self):
        self.settings = get_settings()

    async def rewrite(self, query: str) -> Optional[str]:
        api_key = self.settings.llm_api_key
        if not api_key:
            logger.warning("No LLM API key configured, skipping HyDE rewrite")
            return None

        base_url = self.settings.llm_base_url.rstrip("/")
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.settings.llm_model,
            "messages": [{"role": "user", "content": _HYDE_PROMPT.format(query=query)}],
            "temperature": 0.3,
            "max_tokens": 512,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                logger.info(f"HyDE rewrite: {query[:30]} -> {content[:50]}...")
                return content.strip()
        except Exception as e:
            logger.error(f"HyDE rewrite failed: {e}")
            return None
