"""真实 /api/ask 路由 — 替换占位实现"""
from typing import AsyncIterator, Optional

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel

from app.generation.streamer import SSEStreamer

router = APIRouter()


class AskRequest(BaseModel):
    doc_id: str
    query: str
    mode: str = "hierarchical"
    session_id: Optional[str] = None
    history: Optional[list[dict]] = None
    rewrite_options: Optional[dict] = None
    doc_ids: Optional[list[str]] = None


@router.post("")
async def ask(request: AskRequest) -> StreamingResponse:
    logger.info(f"Ask request: doc_id={request.doc_id}, query={request.query[:50]}, mode={request.mode}")

    streamer = SSEStreamer()

    async def stream() -> AsyncIterator[str]:
        async for event in streamer.stream_response(
            query=request.query,
            doc_id=request.doc_id,
            mode=request.mode,
            history=request.history,
            rewrite_options=request.rewrite_options,
            doc_ids=request.doc_ids,
        ):
            yield event

    return StreamingResponse(stream(), media_type="text/event-stream")
