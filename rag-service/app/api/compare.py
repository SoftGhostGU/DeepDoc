"""对比模式 API — 朴素 vs 层级双引擎并行 SSE"""
import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel

from app.retrieval.hierarchical import HierarchicalRetriever
from app.retrieval.naive import NaiveRetriever
from app.generation.generator import Generator
from app.generation.prompt_templates import build_compare_prompt
from app.generation.citation_extractor import extract_citations

router = APIRouter()


class CompareRequest(BaseModel):
    doc_id: str
    query: str


def _sse(event: str, data: dict) -> str:
    payload = {"event": event, "data": data}
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _run_track(
    track_name: str,
    queue: asyncio.Queue,
    query: str,
    doc_id: str,
    retriever_cls: type,
    mode: str,
):
    try:
        retriever = retriever_cls()
        if hasattr(retriever, "retrieve"):
            if mode == "naive":
                results, _ = await retriever.retrieve(query, doc_id)
            else:
                _, results, _ = await retriever.retrieve(query, doc_id)

        generator = Generator()
        prompt = build_compare_prompt(query, results, mode=mode)

        full_answer = ""
        async for token in generator.generate_stream(query, results, prompt_template=prompt):
            full_answer += token
            await queue.put(_sse("compare_track", {
                "track": track_name, "token": token,
            }))

        citations = await extract_citations(full_answer, results, doc_id)
        await queue.put(_sse("compare_track", {
            "track": track_name,
            "answer": full_answer,
            "citations": citations,
            "done": True,
        }))
    except Exception as e:
        logger.error(f"{track_name} track error: {e}")
        await queue.put(_sse("compare_track", {
            "track": track_name,
            "answer": f"生成失败: {str(e)}",
            "done": True,
        }))
    finally:
        await queue.put(None)


@router.post("")
async def compare(request: CompareRequest) -> StreamingResponse:
    logger.info(f"Compare request: doc_id={request.doc_id}, query={request.query[:50]}")

    async def stream() -> AsyncIterator[str]:
        yield _sse("stage", {"stage": "analyzing", "message": "正在准备对比查询..."})

        merged_queue: asyncio.Queue = asyncio.Queue()

        naive_task = asyncio.create_task(
            _run_track("naive", merged_queue, request.query, request.doc_id, NaiveRetriever, "naive")
        )
        hier_task = asyncio.create_task(
            _run_track("hierarchical", merged_queue, request.query, request.doc_id, HierarchicalRetriever, "hierarchical")
        )

        done_count = 0
        while done_count < 2:
            item = await merged_queue.get()
            if item is None:
                done_count += 1
                continue
            yield item

        yield _sse("final", {"answer": "对比完成", "citations": []})

    return StreamingResponse(stream(), media_type="text/event-stream")
