"""Embedding service supporting local and OpenAI-compatible remote models."""

import asyncio
import os
from typing import Optional

import httpx
from loguru import logger

from app.core.config import get_settings


class EmbeddingService:
    """Vector embedding service."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[object] = None

    def __init__(self, model_name: str = "bge-large-zh-v1.5"):
        self.model_name = model_name
        self.settings = get_settings()
        self.dimension = self.settings.vector_dimension
        self._use_remote = self._should_use_remote(model_name)

    def _should_use_remote(self, model_name: str) -> bool:
        embedding_base_url = getattr(self.settings, "embedding_base_url", None)
        if embedding_base_url:
            return True

        remote_prefixes = (
            "glm-",
            "embedding-",
            "text-embedding-",
            "ecnu-embedding-",
        )
        return model_name.startswith(remote_prefixes)

    def _get_remote_api_key(self) -> str:
        api_key = getattr(self.settings, "embedding_api_key", None) or self.settings.llm_api_key
        if not api_key:
            raise ValueError("Embedding API key not configured")
        return api_key

    def _get_remote_url(self) -> str:
        base_url = getattr(self.settings, "embedding_base_url", None) or self.settings.llm_base_url
        if not base_url:
            raise ValueError("Embedding base URL not configured")

        normalized = base_url.rstrip("/")
        if normalized.endswith("/embeddings"):
            return normalized
        return f"{normalized}/embeddings"

    @classmethod
    async def get_instance(cls) -> "EmbeddingService":
        """Return the singleton instance."""
        if cls._instance is None:
            model = get_settings().embedding_model
            cls._instance = cls(model_name=model)
            await cls._instance._load_model()
        return cls._instance

    async def _load_model(self) -> None:
        """Load the configured embedding model."""
        if self._model is not None:
            return

        if self._use_remote:
            logger.info(f"Using remote embedding model: {self.model_name}")
            self._model = "remote"
            return

        from sentence_transformers import SentenceTransformer

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
        """Encode a list of texts."""
        if not texts:
            return []

        if self._model is None:
            await self._load_model()

        if self._use_remote:
            return await self._encode_remote(texts)

        return await self._encode_local(texts, batch_size, normalize)

    async def _encode_remote(self, texts: list[str]) -> list[list[float]]:
        """Call a remote OpenAI-compatible embedding endpoint."""
        headers = {
            "Authorization": f"Bearer {self._get_remote_api_key()}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": texts,
            "model": self.model_name,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self._get_remote_url(),
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return [item["embedding"] for item in data["data"]]

    async def _encode_local(
        self,
        texts: list[str],
        batch_size: int,
        normalize: bool,
    ) -> list[list[float]]:
        """Encode with a local SentenceTransformer model."""
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
        """Encode a single text."""
        results = await self.encode([text], normalize=normalize)
        return results[0] if results else []

    def get_dimension(self) -> int:
        """Return embedding vector dimension."""
        return self.dimension


_embedding_service: Optional[EmbeddingService] = None


async def get_embedding_service() -> EmbeddingService:
    """Return the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = await EmbeddingService.get_instance()
    return _embedding_service
