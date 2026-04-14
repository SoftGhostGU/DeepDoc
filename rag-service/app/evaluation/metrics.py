"""评估指标算法"""
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
from loguru import logger

from app.evaluation.loader import EvaluationSample


class RetrievalMetrics:
    """检索质量指标"""

    @staticmethod
    def hit_rate(retrieved_ids: list[str], ground_truth_ids: list[str]) -> float:
        """命中率 - 是否命中任何相关文档"""
        if not ground_truth_ids:
            return 0.0
        return float(any(rid in ground_truth_ids for rid in retrieved_ids))

    @staticmethod
    def mrr(retrieved_ids: list[str], ground_truth_ids: list[str]) -> float:
        """平均倒数排名"""
        if not ground_truth_ids:
            return 0.0

        for rank, rid in enumerate(retrieved_ids, start=1):
            if rid in ground_truth_ids:
                return 1.0 / rank
        return 0.0

    @staticmethod
    def precision(
        retrieved_content: list[str],
        ground_truth_content: list[str],
    ) -> float:
        """精确率"""
        if not retrieved_content:
            return 0.0

        relevant = sum(1 for r in retrieved_content if r in ground_truth_content)
        return relevant / len(retrieved_content)

    @staticmethod
    def recall(
        retrieved_content: list[str],
        ground_truth_content: list[str],
    ) -> float:
        """召回率"""
        if not ground_truth_content:
            return 0.0

        relevant = sum(1 for r in retrieved_content if r in ground_truth_content)
        return relevant / len(ground_truth_content)

    @staticmethod
    def f1_score(precision: float, recall: float) -> float:
        """F1 分数"""
        if precision + recall == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)


class PathMetrics:
    """路径准确性指标"""

    @staticmethod
    def section_path_accuracy(
        retrieved_path: list[str],
        ground_truth_path: list[str],
    ) -> float:
        """检索路径与真实路径的一致性"""
        if not ground_truth_path:
            return 0.0

        correct_layers = 0
        for i, (ret, gt) in enumerate(zip(retrieved_path, ground_truth_path)):
            if ret == gt:
                correct_layers += 1
            else:
                break

        return correct_layers / len(ground_truth_path)

    @staticmethod
    def ancestor_match(
        retrieved_ids: list[str],
        ground_truth_section_id: str,
        all_sections: dict,
    ) -> float:
        """祖先节点匹配"""
        if not ground_truth_section_id:
            return 0.0

        ancestors = []
        current = ground_truth_section_id
        while current:
            ancestors.append(current)
            section = all_sections.get(current, {})
            current = section.get("parent_id")

        retrieved_set = set(retrieved_ids)
        for anc in ancestors:
            if anc in retrieved_set:
                return 1.0

        return 0.0


class EvaluationResult:
    """评估结果"""
    def __init__(
        self,
        sample: EvaluationSample,
        retrieved_ids: list[str],
        retrieved_content: list[str],
        scores: dict[str, float],
        latency_ms: float,
    ):
        self.sample = sample
        self.retrieved_ids = retrieved_ids
        self.retrieved_content = retrieved_content
        self.scores = scores
        self.latency_ms = latency_ms

    def to_dict(self) -> dict:
        return {
            "query": self.sample.query,
            "retrieved_ids": self.retrieved_ids,
            "retrieved_content": (self.retrieved_content[:200] + "...") if self.retrieved_content else "",
            "is_correct": self.scores.get("hit_rate", 0) > 0,
            "scores": self.scores,
            "latency_ms": self.latency_ms,
        }


class MetricsAggregator:
    """指标聚合器"""

    @staticmethod
    def aggregate(results: list[EvaluationResult]) -> dict[str, Any]:
        """聚合评估结果"""
        if not results:
            return {}

        hit_rates = [r.scores.get("hit_rate", 0) for r in results]
        mrrs = [r.scores.get("mrr", 0) for r in results]
        precisions = [r.scores.get("precision", 0) for r in results]
        recalls = [r.scores.get("recall", 0) for r in results]
        f1s = [r.scores.get("f1", 0) for r in results]
        latencies = [r.latency_ms for r in results]

        avg_metrics = {
            "hit_rate": float(np.mean(hit_rates)),
            "mrr": float(np.mean(mrrs)),
            "precision": float(np.mean(precisions)),
            "recall": float(np.mean(recalls)),
            "f1": float(np.mean(f1s)),
            "avg_latency_ms": float(np.mean(latencies)),
        }

        bad_cases = [r for r in results if r.scores.get("hit_rate", 0) == 0]
        bad_case_samples = [
            {
                "query": r.sample.query,
                "retrieved_ids": r.retrieved_ids,
                "ground_truth_section_ids": r.sample.ground_truth_section_ids,
            }
            for r in bad_cases[:5]
        ]

        return {
            "overall": avg_metrics,
            "case_count": len(results),
            "bad_case_count": len(bad_cases),
            "bad_cases": bad_case_samples,
        }