"""评估数据加载器"""
import csv
import json
from pathlib import Path
from typing import Any, Optional

from loguru import logger


class EvaluationSample:
    """评估样本"""
    def __init__(
        self,
        query: str,
        ground_truth_context: str,
        answer: str,
        ground_truth_section_ids: Optional[list[str]] = None,
    ):
        self.query = query
        self.ground_truth_context = ground_truth_context
        self.ground_truth_section_ids = ground_truth_section_ids or []
        self.answer = answer

    @classmethod
    def from_dict(cls, data: dict) -> "EvaluationSample":
        return cls(
            query=data["query"],
            ground_truth_context=data["ground_truth_context"],
            answer=data.get("answer", ""),
            ground_truth_section_ids=data.get("ground_truth_section_ids", []),
        )

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "ground_truth_context": self.ground_truth_context,
            "answer": self.answer,
            "ground_truth_section_ids": self.ground_truth_section_ids,
        }


class EvaluationLoader:
    """评估数据加载器"""

    @staticmethod
    def load_jsonl(file_path: str) -> list[EvaluationSample]:
        """从 JSONL 文件加载"""
        samples = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                samples.append(EvaluationSample.from_dict(data))

        logger.info(f"Loaded {len(samples)} samples from {file_path}")
        return samples

    @staticmethod
    def load_json(file_path: str) -> list[EvaluationSample]:
        """从 JSON 文件加载（数组格式）"""
        samples = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            for item in data:
                samples.append(EvaluationSample.from_dict(item))

        logger.info(f"Loaded {len(samples)} samples from {file_path}")
        return samples

    @staticmethod
    def load_csv(file_path: str) -> list[EvaluationSample]:
        """从 CSV 文件加载"""
        samples = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                samples.append(EvaluationSample.from_dict(row))

        logger.info(f"Loaded {len(samples)} samples from {file_path}")
        return samples

    @staticmethod
    def load(file_path: str) -> list[EvaluationSample]:
        """自动识别格式并加载"""
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix == ".jsonl":
            return EvaluationLoader.load_jsonl(file_path)
        elif suffix == ".json":
            return EvaluationLoader.load_json(file_path)
        elif suffix == ".csv":
            return EvaluationLoader.load_csv(file_path)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")