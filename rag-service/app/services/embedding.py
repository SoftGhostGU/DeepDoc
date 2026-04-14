"""向量嵌入服务 - 支持本地模型和智谱 API"""
import asyncio
import os
from typing import Optional

import httpx
import numpy as np
from loguru import logger

from app.core.config import get_settings


class EmbeddingService:
    """向量化服务 - 支持本地模型和智谱 API"""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[object] = None  # 本地模型（SentenceTransformer）

    def __init__(self, model_name: str = "bge-large-zh-v1.5"):
        self.model_name = model_name
        self.settings = get_settings()
        self.dimension = self.settings.vector_dimension
        self._use_remote = model_name.startswith("glm-") or model_name.startswith("embedding-")

    @classmethod
    async def get_instance(cls) -> "EmbeddingService":
        """获取单例"""
        if cls._instance is None:
            model = get_settings().embedding_model
            cls._instance = cls(model_name=model)
            await cls._instance._load_model()
        return cls._instance

    async def _load_model(self) -> None:
        """加载模型"""
        if self._model is not None:
            return

        if self._use_remote:
            # 智谱远程 API（使用本地 API Key）
            logger.info(f"Using remote embedding model: {self.model_name}")
            self._model = "remote"
        else:
            # 本地 SentenceTransformer 模型
            from sentence_transformers import SentenceTransformer

            # 设置 HuggingFace 镜像
            hf_endpoint = os.environ.get("HF_ENDPOINT") or os.environ.get("HF_MIRROR")
            if hf_endpoint:
                os.environ["HF_ENDPOINT"] = hf_endpoint
                logger.info(f"Using HuggingFace mirror: {hf_endpoint}")

            logger.info(f"Loading embedding model: {self.model_name}")
            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None,
                SentenceTransformer,
                self.model_name,
            )
            logger.info(f"Embedding model loaded: {self.model_name}")

    async def encode(
        self,
        texts: list[str],
        batch_size: int = 32,
        normalize: bool = True,
    ) -> list[list[float]]:
        """批量编码"""
        if not texts:
            return []

        if self._model is None:
            await self._load_model()

        if self._use_remote:
            return await self._encode_remote(texts)
        else:
            return await self._encode_local(texts, batch_size, normalize)

    async def _encode_remote(self, texts: list[str]) -> list[list[float]]:
        """智谱远程 API"""
        api_key = self.settings.llm_api_key
        if not api_key:
            raise ValueError("LLM_API_KEY not configured")

        # 智谱 API 端点
        url = "https://open.bigmodel.cn/api/paas/v4/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        embeddings = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            for text in texts:
                payload = {
                    "input": text,
                    "model": self.model_name,
                }
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                embeddings.append(data["data"][0]["embedding"])

        return embeddings

    async def _encode_local(
        self,
        texts: list[str],
        batch_size: int,
        normalize: bool,
    ) -> list[list[float]]:
        """本地模型编码"""
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            self._model.encode,
            texts,
            batch_size,
            normalize,
        )
        return embeddings.tolist()

    async def encode_one(self, text: str, normalize: bool = True) -> list[float]:
        """编码单个文本"""
        results = await self.encode([text], normalize=normalize)
        return results[0] if results else []

    def get_dimension(self) -> int:
        """获取向量维度"""
        return self.dimension


# ==================== 全局实例 ====================


_embedding_service: Optional[EmbeddingService] = None


async def get_embedding_service() -> EmbeddingService:
    """获取向量化服务实例"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = await EmbeddingService.get_instance()
    return _embedding_service