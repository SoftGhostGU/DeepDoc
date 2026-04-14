"""评估 API 路由"""
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.core import get_settings, logger
from app.evaluation.database import init_evaluation_db, save_eval_result, get_eval_results
from app.evaluation.loader import EvaluationLoader
from app.evaluation.metrics import (
    EvaluationResult,
    MetricsAggregator,
    PathMetrics,
    RetrievalMetrics,
)
from app.services.embedding import get_embedding_service


# ==================== 请求模型 ====================


class EvaluateRequest(BaseModel):
    """评估请求"""
    doc_id: str = Field(description="文档ID")
    eval_file: Optional[str] = Field(default=None, description="评估文件路径")
    use_hierarchy: bool = Field(default=True, description="是否使用层级索引")
    top_k: int = Field(default=5, description="检索返回数")


class EvaluateResponse(BaseModel):
    """评估响应"""
    eval_id: str = Field(description="评估ID")
    status: str = Field(description="状态")
    message: str = Field(description="消息")


# ==================== 路由实例 ====================

router = APIRouter()


# ==================== 评估执行逻辑 ====================


async def run_evaluation(
    eval_id: str,
    doc_id: str,
    samples: list,
    use_hierarchy: bool,
    top_k: int,
) -> dict:
    """执行评估"""
    from app.indexing.builder import search_similar
    from app.services.embedding import get_embedding_service

    results: list[EvaluationResult] = []
    embed_service = await get_embedding_service()

    for i, sample in enumerate(samples):
        start_time = time.time()

        # 检索
        search_results = await search_similar(
            doc_id=doc_id,
            query=sample.query,
            top_k=top_k,
            granularity="summary" if use_hierarchy else "detail",
        )

        # 提取检索结果
        retrieved_ids = [r["chunk_id"] for r in search_results]
        retrieved_content = [r["content"] for r in search_results]

        # 计算指标
        hit_rate = RetrievalMetrics.hit_rate(
            retrieved_ids,
            sample.ground_truth_section_ids or [],
        )
        mrr = RetrievalMetrics.mrr(
            retrieved_ids,
            sample.ground_truth_section_ids or [],
        )
        precision = RetrievalMetrics.precision(
            retrieved_content,
            [sample.ground_truth_context],
        )
        recall = RetrievalMetrics.recall(
            retrieved_content,
            [sample.ground_truth_context],
        )
        f1 = RetrievalMetrics.f1_score(precision, recall)

        latency_ms = (time.time() - start_time) * 1000

        scores = {
            "hit_rate": hit_rate,
            "mrr": mrr,
            "precision": precision,
            "recall": recall,
            "f1": f1,
        }

        result = EvaluationResult(
            sample=sample,
            retrieved_ids=retrieved_ids,
            retrieved_content=retrieved_content,
            scores=scores,
            latency_ms=latency_ms,
        )
        results.append(result)

        # 进度日志
        if (i + 1) % 10 == 0:
            logger.info(f"Evaluated {i + 1}/{len(samples)} samples")

    # 聚合结果
    aggregated = MetricsAggregator.aggregate(results)

    # 保存到数据库
    await save_eval_result({
        "id": eval_id,
        "doc_id": doc_id,
        "eval_set_name": "default",
        "use_hierarchy": 1 if use_hierarchy else 0,
        "total_cases": len(results),
        "hit_rate": aggregated["overall"]["hit_rate"],
        "mrr": aggregated["overall"]["mrr"],
        "precision": aggregated["overall"]["precision"],
        "recall": aggregated["overall"]["recall"],
        "f1": aggregated["overall"]["f1"],
        "avg_latency_ms": aggregated["overall"]["avg_latency_ms"],
        "bad_case_count": aggregated["bad_case_count"],
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })

    logger.info(f"Evaluation completed: {eval_id}")

    return {
        "eval_id": eval_id,
        "doc_id": doc_id,
        "use_hierarchy": use_hierarchy,
        **aggregated,
    }


# ==================== API 接口 ====================


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    request: EvaluateRequest,
    background_tasks: BackgroundTasks,
) -> EvaluateResponse:
    """评估接口 - 触发异步评估"""
    eval_id = f"eval_{uuid.uuid4().hex[:8]}"

    try:
        # 加载评估数据
        settings = get_settings()
        eval_dir = Path("./evaluation")
        eval_file = request.eval_file or str(eval_dir / "samples.jsonl")

        if not Path(eval_file).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Evaluation file not found: {eval_file}",
            )

        samples = EvaluationLoader.load(eval_file)
        logger.info(f"Loaded {len(samples)} evaluation samples")

        # 异步执行评估
        background_tasks.add_task(
            run_evaluation,
            eval_id,
            request.doc_id,
            samples,
            request.use_hierarchy,
            request.top_k,
        )

        return EvaluateResponse(
            eval_id=eval_id,
            status="processing",
            message=f"Evaluation started. ID: {eval_id}",
        )

    except Exception as e:
        logger.exception("Evaluation failed to start")
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation failed: {str(e)}",
        )


@router.get("/history/{doc_id}")
async def get_evaluation_history(
    doc_id: str,
    limit: int = 10,
) -> dict:
    """获取评估历史"""
    try:
        history = await get_eval_results(doc_id, limit)
        return {
            "doc_id": doc_id,
            "history": history,
            "count": len(history),
        }
    except Exception as e:
        logger.exception("Failed to get evaluation history")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get history: {str(e)}",
        )