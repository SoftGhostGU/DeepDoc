"""检索 API — POST /api/retrieve"""
import time

from fastapi import APIRouter
from loguru import logger

from app.models.retrieval import RetrievalRequest, RetrievalResponse, RetrievalResultItem
from app.retrieval.hierarchical import HierarchicalRetriever
from app.retrieval.naive import NaiveRetriever

router = APIRouter()


@router.post("")
async def retrieve(request: RetrievalRequest) -> RetrievalResponse:
    start = time.time()

    try:
        if request.mode == "naive":
            naive = NaiveRetriever()
            results, path = await naive.retrieve(
                request.query, request.doc_id, top_k=request.top_k, use_rerank=request.rerank,
            )
            section_results = []
        else:
            hier = HierarchicalRetriever()
            section_results, results, path = await hier.retrieve(
                request.query, request.doc_id, final_top_k=request.top_k, use_rerank=request.rerank,
            )

        build_time = time.time() - start

        return RetrievalResponse(
            results=[RetrievalResultItem(**r.model_dump()) for r in results],
            retrieval_path=path,
            scores=[r.score for r in results],
            build_time=build_time,
        )
    except Exception as e:
        logger.error(f"Retrieve failed: {e}")
        return RetrievalResponse(
            results=[],
            retrieval_path=[],
            scores=[],
            build_time=time.time() - start,
        )
