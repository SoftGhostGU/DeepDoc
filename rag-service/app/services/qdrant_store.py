"""Qdrant storage service for dense vectors."""

from __future__ import annotations

import hashlib
from typing import Optional

from loguru import logger
from qdrant_client import AsyncQdrantClient, models

from app.core.config import get_settings


def _distance_from_config(distance: str) -> models.Distance:
    value = (distance or "").strip().lower()
    if value == "dot":
        return models.Distance.DOT
    if value == "euclid":
        return models.Distance.EUCLID
    if value == "manhattan":
        return models.Distance.MANHATTAN
    return models.Distance.COSINE


def _point_id_from_chunk_id(chunk_id: str) -> int:
    digest = hashlib.blake2b(chunk_id.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big", signed=False)


class QdrantStore:
    _instance: Optional["QdrantStore"] = None

    def __init__(self):
        self.settings = get_settings()
        self.collection_name = self.settings.qdrant_collection
        self._client: Optional[AsyncQdrantClient] = None
        self._collection_ready = False

    @classmethod
    async def get_instance(cls) -> "QdrantStore":
        if cls._instance is None:
            cls._instance = cls()
            await cls._instance._ensure_collection()
        return cls._instance

    async def _get_client(self) -> AsyncQdrantClient:
        if self._client is not None:
            return self._client

        if self.settings.qdrant_url:
            self._client = AsyncQdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key,
                timeout=60,
            )
        else:
            self._client = AsyncQdrantClient(
                host=self.settings.qdrant_host,
                port=self.settings.qdrant_port,
                api_key=self.settings.qdrant_api_key,
                timeout=60,
            )
        return self._client

    async def _ensure_collection(self) -> None:
        if self._collection_ready:
            return

        client = await self._get_client()
        exists = await client.collection_exists(self.collection_name)
        if not exists:
            await client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.settings.vector_dimension,
                    distance=_distance_from_config(self.settings.qdrant_distance),
                ),
            )
            logger.info(f"Qdrant collection created: {self.collection_name}")
        self._collection_ready = True

    async def delete_document_chunks(self, doc_id: str) -> None:
        await self._ensure_collection()
        client = await self._get_client()
        await client.delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="doc_id",
                            match=models.MatchValue(value=doc_id),
                        )
                    ]
                )
            ),
            wait=True,
        )

    async def upsert_chunks(self, chunks: list[dict]) -> None:
        if not chunks:
            return

        await self._ensure_collection()
        client = await self._get_client()

        points: list[models.PointStruct] = []
        for chunk in chunks:
            vector = chunk.get("embedding")
            if vector is None:
                continue
            chunk_id = chunk["id"]
            points.append(
                models.PointStruct(
                    id=_point_id_from_chunk_id(chunk_id),
                    vector=vector,
                    payload={
                        "doc_id": chunk["doc_id"],
                        "chunk_id": chunk_id,
                        "chunk_type": chunk.get("chunk_type"),
                        "granularity": chunk.get("granularity"),
                        "section_id": chunk.get("section_id"),
                        "page_numbers": chunk.get("page_numbers", []),
                    },
                )
            )

        if not points:
            return

        await client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True,
        )
        logger.info(f"Qdrant upserted chunks: {len(points)}")

    async def search(
        self,
        doc_id: str,
        query_vector: list[float],
        top_k: int,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> list[dict]:
        await self._ensure_collection()
        client = await self._get_client()

        must_conditions = [
            models.FieldCondition(
                key="doc_id",
                match=models.MatchValue(value=doc_id),
            )
        ]
        if chunk_type:
            must_conditions.append(
                models.FieldCondition(
                    key="chunk_type",
                    match=models.MatchValue(value=chunk_type),
                )
            )
        if granularity:
            must_conditions.append(
                models.FieldCondition(
                    key="granularity",
                    match=models.MatchValue(value=granularity),
                )
            )

        query_filter = models.Filter(must=must_conditions)

        if hasattr(client, "search"):
            hits = await client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
                with_vectors=False,
            )
        elif hasattr(client, "query_points"):
            response = await client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
                with_vectors=False,
            )
            hits = response.points
        else:
            raise RuntimeError("Unsupported qdrant-client version: no search/query_points method found")

        results = []
        for hit in hits:
            payload = hit.payload or {}
            chunk_id = payload.get("chunk_id")
            if not chunk_id:
                continue
            results.append(
                {
                    "chunk_id": chunk_id,
                    "score": float(hit.score),
                    "payload": payload,
                }
            )
        return results


_qdrant_store: Optional[QdrantStore] = None


async def get_qdrant_service() -> QdrantStore:
    global _qdrant_store
    if _qdrant_store is None:
        _qdrant_store = await QdrantStore.get_instance()
    return _qdrant_store
