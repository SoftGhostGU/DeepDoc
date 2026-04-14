from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI(title="DeepDoc RAG Service")


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True})


@app.post("/api/documents/parse")
async def parse_document(file: UploadFile = File(...)) -> JSONResponse:
    return JSONResponse(
        {
            "doc_id": f"doc_{file.filename}",
            "structure_tree": {
                "id": "root",
                "title": file.filename,
                "level": 0,
                "children": [],
            },
            "stats": {
                "page_count": 1,
                "paragraph_count": 1,
            },
        }
    )


@app.post("/api/ask")
async def ask() -> StreamingResponse:
    async def stream() -> AsyncIterator[str]:
        stages = [
            ("analyzing", "Analyzing query"),
            ("rewriting", "Rewriting query"),
            ("retrieving_summary", "Retrieving summaries"),
            ("retrieving_paragraphs", "Retrieving paragraphs"),
            ("generating", "Generating answer"),
        ]

        for stage, message in stages:
            await asyncio.sleep(0.05)
            yield _sse("stage", {"event": "stage", "data": {"stage": stage, "message": message}})

        answer = "This is a placeholder response from rag-service."
        for token in answer.split(" "):
            await asyncio.sleep(0.02)
            yield _sse(
                "token",
                {"event": "token", "data": {"stage": "generating", "token": token + " "}},
            )

        yield _sse(
            "final",
            {
                "event": "final",
                "data": {"answer": answer, "citations": [], "retrieval_path": []},
            },
        )

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/compare")
async def compare() -> StreamingResponse:
    async def stream() -> AsyncIterator[str]:
        await asyncio.sleep(0.05)
        yield _sse(
            "compare_track",
            {
                "event": "compare_track",
                "data": {"track": "naive", "answer": "Naive answer", "done": True},
            },
        )
        await asyncio.sleep(0.05)
        yield _sse(
            "compare_track",
            {
                "event": "compare_track",
                "data": {
                    "track": "hierarchical",
                    "answer": "Hierarchical answer",
                    "done": True,
                },
            },
        )
        yield _sse("final", {"event": "final", "data": {"answer": "done", "citations": []}})

    return StreamingResponse(stream(), media_type="text/event-stream")
