from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.exceptions import AppException
from app.main import app


def _index_document(client: TestClient, doc_id: str = "doc1"):
    return client.post(
        f"/api/documents/{doc_id}/index",
        json={
            "doc_id": doc_id,
            "strategies": ["hierarchical"],
        },
    )


def test_build_index_returns_not_found_for_missing_document():
    with patch(
        "app.indexing.builder.IndexBuilder.build",
        new=AsyncMock(side_effect=ValueError("Document not found: doc1")),
    ):
        with TestClient(app) as client:
            response = _index_document(client)

    assert response.status_code == 404
    assert response.json() == {
        "code": "DOCUMENT_NOT_FOUND",
        "message": "Document not found: doc1",
        "detail": None,
    }


def test_build_index_preserves_embedding_upstream_error():
    with patch(
        "app.indexing.builder.IndexBuilder.build",
        new=AsyncMock(
            side_effect=AppException(
                code="EMBEDDING_UPSTREAM_ERROR",
                message="Embedding upstream request failed",
                detail="model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
                status_code=502,
            )
        ),
    ):
        with TestClient(app) as client:
            response = _index_document(client)

    assert response.status_code == 502
    assert response.json() == {
        "code": "EMBEDDING_UPSTREAM_ERROR",
        "message": "Embedding upstream request failed",
        "detail": "model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
    }


def test_build_index_returns_internal_error_for_unknown_failure():
    with patch(
        "app.indexing.builder.IndexBuilder.build",
        new=AsyncMock(side_effect=RuntimeError("boom")),
    ):
        with TestClient(app) as client:
            response = _index_document(client)

    assert response.status_code == 500
    assert response.json() == {
        "code": "INDEX_ERROR",
        "message": "Index building failed",
        "detail": "boom",
    }
