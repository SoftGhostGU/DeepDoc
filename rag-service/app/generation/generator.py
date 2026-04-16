"""LLM 答案生成器 - 支持 DeepSeek / MiniMax API 流式输出"""
import json
from typing import AsyncIterator, Optional

import httpx
from loguru import logger

from app.core.config import get_settings
from app.retrieval.base import RetrievalResult


class Generator:
    def __init__(self):
        self.settings = get_settings()

    async def generate_stream(
        self,
        query: str,
        context_chunks: list[RetrievalResult],
        history: Optional[list[dict]] = None,
        prompt_template: Optional[str] = None,
    ) -> AsyncIterator[str]:
        from app.generation.prompt_templates import build_rag_prompt

        prompt = prompt_template or build_rag_prompt(query, context_chunks, history)

        api_key = self.settings.llm_api_key
        if not api_key:
            yield "错误：未配置 LLM API Key"
            return

        base_url = self.settings.llm_base_url.rstrip("/")
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.settings.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.settings.llm_temperature,
            "max_tokens": self.settings.llm_max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue

                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue

        except httpx.TimeoutException:
            logger.error("LLM request timed out")
            yield "（生成超时，请重试）"
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error: {e.response.status_code}")
            yield f"（生成失败: HTTP {e.response.status_code}）"
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            yield f"（生成失败: {str(e)}）"
