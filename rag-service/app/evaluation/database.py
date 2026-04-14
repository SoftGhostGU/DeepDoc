"""评估数据库表"""
import asyncio
from pathlib import Path
from typing import Optional

import aiosqlite
from loguru import logger

DATABASE_PATH = Path("./data/deepdoc.db")


async def init_evaluation_db() -> None:
    """初始化评估数据库"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # 评估记录表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS eval_results (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                eval_set_name TEXT NOT NULL,
                use_hierarchy INTEGER NOT NULL DEFAULT 1,
                total_cases INTEGER NOT NULL,
                hit_rate REAL,
                mrr REAL,
                precision REAL,
                recall REAL,
                f1 REAL,
                avg_latency_ms REAL,
                bad_case_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_eval_results_doc_id ON eval_results(doc_id)
        """)

        await db.commit()
    logger.info("Evaluation DB initialized")


async def save_eval_result(result: dict) -> None:
    """保存评估结果"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO eval_results (
                id, doc_id, eval_set_name, use_hierarchy, total_cases,
                hit_rate, mrr, precision, recall, f1, avg_latency_ms,
                bad_case_count, created_at
            ) VALUES (
                :id, :doc_id, :eval_set_name, :use_hierarchy, :total_cases,
                :hit_rate, :mrr, :precision, :recall, :f1, :avg_latency_ms,
                :bad_case_count, :created_at
            )
        """, result)
        await db.commit()


async def get_eval_results(doc_id: str, limit: int = 10) -> list[dict]:
    """获取评估历史"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM eval_results WHERE doc_id = ? ORDER BY created_at DESC LIMIT ?",
            (doc_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]