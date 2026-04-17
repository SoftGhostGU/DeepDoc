from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services.embedding import EmbeddingService


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, response: _FakeResponse):
        self.response = response
        self.calls: list[dict] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url: str, headers: dict, json: dict):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return self.response


@pytest.mark.asyncio
async def test_ecnu_embedding_uses_openai_compatible_endpoint_and_llm_fallbacks():
    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url=None,
    )
    fake_client = _FakeAsyncClient(
        _FakeResponse({"data": [{"embedding": [0.1, 0.2, 0.3]}]})
    )

    with patch("app.services.embedding.get_settings", return_value=settings):
        service = EmbeddingService(model_name="ecnu-embedding-small")

    assert service._use_remote is True

    with patch("app.services.embedding.httpx.AsyncClient", return_value=fake_client):
        embeddings = await service.encode(["hello"])

    assert embeddings == [[0.1, 0.2, 0.3]]
    assert fake_client.calls == [
        {
            "url": "https://chat.ecnu.edu.cn/open/api/v1/embeddings",
            "headers": {
                "Authorization": "Bearer llm-key",
                "Content-Type": "application/json",
            },
            "json": {
                "input": ["hello"],
                "model": "ecnu-embedding-small",
            },
        }
    ]


def test_local_bge_model_stays_local_without_remote_base_url():
    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url=None,
    )

    with patch("app.services.embedding.get_settings", return_value=settings):
        service = EmbeddingService(model_name="bge-large-zh-v1.5")

    assert service._use_remote is False
