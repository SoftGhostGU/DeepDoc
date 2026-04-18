from types import SimpleNamespace
from unittest.mock import patch

import pytest
import httpx

from app.exceptions import AppException
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


class _QueuedAsyncClient:
    def __init__(self, responses: list[_FakeResponse]):
        self.responses = responses
        self.calls: list[dict] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url: str, headers: dict, json: dict):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return self.responses.pop(0)


@pytest.mark.asyncio
async def test_ecnu_embedding_uses_explicit_openai_compatible_endpoint_and_llm_api_key_fallback():
    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url="https://embed.example.com/v1",
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
            "url": "https://embed.example.com/v1/embeddings",
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


@pytest.mark.asyncio
async def test_remote_embedding_requires_explicit_embedding_base_url():
    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url=None,
    )

    with patch("app.services.embedding.get_settings", return_value=settings):
        service = EmbeddingService(model_name="ecnu-embedding-small")

    with pytest.raises(AppException, match="Embedding base URL"):
        await service.encode(["hello"])


@pytest.mark.asyncio
async def test_remote_embedding_wraps_upstream_status_with_context():
    request = httpx.Request("POST", "https://embed.example.com/v1/embeddings")
    response = httpx.Response(500, request=request)

    class _ErrorAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url: str, headers: dict, json: dict):
            raise httpx.HTTPStatusError(
                "Server error '500 Internal Server Error'",
                request=request,
                response=response,
            )

    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url="https://embed.example.com/v1",
    )

    with patch("app.services.embedding.get_settings", return_value=settings):
        service = EmbeddingService(model_name="ecnu-embedding-small")

    with patch("app.services.embedding.httpx.AsyncClient", return_value=_ErrorAsyncClient()):
        with pytest.raises(AppException, match="Embedding upstream request failed") as exc_info:
            await service.encode(["hello"])

    assert exc_info.value.code == "EMBEDDING_UPSTREAM_ERROR"
    assert exc_info.value.status_code == 502
    assert "model=ecnu-embedding-small" in exc_info.value.detail
    assert "url=https://embed.example.com/v1/embeddings" in exc_info.value.detail


@pytest.mark.asyncio
async def test_remote_embedding_respects_batch_size_for_large_requests():
    settings = SimpleNamespace(
        vector_dimension=1024,
        llm_api_key="llm-key",
        llm_base_url="https://chat.ecnu.edu.cn/open/api/v1",
        embedding_api_key=None,
        embedding_base_url="https://embed.example.com/v1",
    )
    fake_client = _QueuedAsyncClient(
        [
            _FakeResponse({"data": [{"embedding": [1.0]}, {"embedding": [2.0]}]}),
            _FakeResponse({"data": [{"embedding": [3.0]}, {"embedding": [4.0]}]}),
            _FakeResponse({"data": [{"embedding": [5.0]}]}),
        ]
    )

    with patch("app.services.embedding.get_settings", return_value=settings):
        service = EmbeddingService(model_name="ecnu-embedding-small")

    with patch("app.services.embedding.httpx.AsyncClient", return_value=fake_client):
        embeddings = await service.encode(
            ["chunk-1", "chunk-2", "chunk-3", "chunk-4", "chunk-5"],
            batch_size=2,
        )

    assert embeddings == [[1.0], [2.0], [3.0], [4.0], [5.0]]
    assert [call["json"]["input"] for call in fake_client.calls] == [
        ["chunk-1", "chunk-2"],
        ["chunk-3", "chunk-4"],
        ["chunk-5"],
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
