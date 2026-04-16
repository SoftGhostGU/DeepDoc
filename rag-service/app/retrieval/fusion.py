"""RRF 融合 - 倒数排名融合"""
from app.retrieval.base import RetrievalResult


def rrf_fuse(
    result_lists: list[list[RetrievalResult]],
    k: int = 60,
) -> list[RetrievalResult]:
    if not result_lists:
        return []

    chunk_scores: dict[str, float] = {}
    chunk_data: dict[str, RetrievalResult] = {}

    for results in result_lists:
        for rank, result in enumerate(results):
            cid = result.chunk_id
            rrf_score = 1.0 / (k + rank + 1)

            if cid not in chunk_scores:
                chunk_scores[cid] = 0.0
                chunk_data[cid] = result.model_copy(update={"source": "fused"})

            chunk_scores[cid] += rrf_score
            if chunk_data[cid].content != result.content:
                chunk_data[cid] = result.model_copy(update={"source": "fused"})

    sorted_ids = sorted(chunk_scores, key=chunk_scores.get, reverse=True)
    max_score = chunk_scores[sorted_ids[0]] if sorted_ids else 1.0

    return [
        chunk_data[cid].model_copy(update={"score": chunk_scores[cid] / max_score if max_score > 0 else 0.0})
        for cid in sorted_ids
    ]
