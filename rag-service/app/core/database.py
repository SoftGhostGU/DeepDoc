"""数据库模块 - SQLite 存储（包含向量）"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import aiosqlite
from loguru import logger

from app.core.config import get_settings

DATABASE_PATH = Path("./data/deepdoc.db")


async def init_db() -> None:
    """初始化数据库"""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # 启用外键
        await db.execute("PRAGMA foreign_keys = ON")

        # ===== 文档表 =====
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                format TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                page_count INTEGER DEFAULT 0,
                char_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                paragraph_count INTEGER DEFAULT 0,
                section_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT
            )
        """)

        # ===== 章节表 =====
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sections (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                title TEXT NOT NULL,
                level INTEGER NOT NULL DEFAULT 1,
                parent_id TEXT,
                start_page INTEGER NOT NULL,
                end_page INTEGER NOT NULL,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES sections(id) ON DELETE SET NULL
            )
        """)

        # 章节索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_sections_doc_id ON sections(doc_id)
        """)

        # ===== 向量分块表 =====
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                section_id TEXT,
                content TEXT NOT NULL,
                chunk_type TEXT NOT NULL,  -- 'section', 'paragraph', 'sentence', 'summary'
                granularity TEXT NOT NULL, -- 'detail' or 'summary'
                position INTEGER NOT NULL DEFAULT 0,
                page_numbers TEXT,  -- JSON array
                char_count INTEGER DEFAULT 0,
                embedding BLOB,  -- 存储为二进制pickle
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
            )
        """)

        # 分块索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id)
        """)

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_section_id ON chunks(section_id)
        """)

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_type ON chunks(chunk_type, granularity)
        """)

        # ===== 索引记录表 =====
        await db.execute("""
            CREATE TABLE IF NOT EXISTS indices (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                collection_name TEXT,
                strategy TEXT NOT NULL,  -- 'hierarchical', 'naive', 'semantic'
                chunk_type TEXT,
                chunk_count INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                embedding_model TEXT,
                build_time_seconds REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)

        # ===== 评估结果表 =====
        await db.execute("""
            CREATE TABLE IF NOT EXISTS eval_results (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                query TEXT NOT NULL,
                answer TEXT,
                reference TEXT,
                precision_score REAL,
                recall_score REAL,
                f1_score REAL,
                context_used TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)

        await db.execute("VACUUM")
        await db.commit()

    logger.info(f"Database initialized: {DATABASE_PATH}")


# ==================== 文档操作 ====================


async def save_document(doc_data: dict) -> None:
    """保存文档元数据"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO documents (
                id, title, format, status, file_path, file_size,
                page_count, char_count, word_count, paragraph_count,
                section_count, updated_at
            ) VALUES (
                :id, :title, :format, :status, :file_path, :file_size,
                :page_count, :char_count, :word_count, :paragraph_count,
                :section_count, CURRENT_TIMESTAMP
            )
        """, doc_data)
        await db.commit()


async def get_document(doc_id: str) -> Optional[dict]:
    """获取文档"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def list_documents() -> list[dict]:
    """列出所有文档"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM documents ORDER BY created_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def update_document_status(doc_id: str, status: str, error_message: Optional[str] = None) -> None:
    """更新文档状态"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE documents SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, error_message, doc_id)
        )
        await db.commit()


# ==================== 章节操作 ====================


async def save_sections(sections: list[dict]) -> None:
    """批量保存章节"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")

        for section in sections:
            await db.execute("""
                INSERT OR REPLACE INTO sections (
                    id, doc_id, title, level, parent_id,
                    start_page, end_page, summary
                ) VALUES (
                    :id, :doc_id, :title, :level, :parent_id,
                    :start_page, :end_page, :summary
                )
            """, section)

        await db.commit()


async def get_sections(doc_id: str) -> list[dict]:
    """获取文档的章节"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM sections WHERE doc_id = ? ORDER BY start_page",
            (doc_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# ==================== 向量分块操作 ====================


async def save_chunks(chunks: list[dict]) -> None:
    """批量保存分块（包含向量）"""
    import pickle

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # 暂时禁用外键以避免引用问题
        await db.execute("PRAGMA foreign_keys = OFF")

        for chunk in chunks:
            # 将向量序列化为二进制
            embedding_blob = None
            if chunk.get("embedding") is not None:
                embedding_blob = pickle.dumps(chunk["embedding"])

            # 序列化页码列表
            page_numbers = json.dumps(chunk.get("page_numbers", []))

            await db.execute("""
                INSERT OR REPLACE INTO chunks (
                    id, doc_id, section_id, content, chunk_type, granularity,
                    position, page_numbers, char_count, embedding
                ) VALUES (
                    :id, :doc_id, :section_id, :content, :chunk_type, :granularity,
                    :position, :page_numbers, :char_count, :embedding
                )
            """, {
                **chunk,
                "page_numbers": page_numbers,
                "embedding": embedding_blob,
            })

        await db.commit()
        logger.info(f"Saved {len(chunks)} chunks")


async def get_chunks(doc_id: str, chunk_type: Optional[str] = None, granularity: Optional[str] = None) -> list[dict]:
    """获取文档的分块"""
    import pickle

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM chunks WHERE doc_id = ?"
        params = [doc_id]

        if chunk_type:
            query += " AND chunk_type = ?"
            params.append(chunk_type)

        if granularity:
            query += " AND granularity = ?"
            params.append(granularity)

        query += " ORDER BY position"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                chunk = dict(row)
                # 反序列化向量
                if chunk.get("embedding"):
                    chunk["embedding"] = pickle.loads(chunk["embedding"])
                # 反序列化页码
                if chunk.get("page_numbers"):
                    chunk["page_numbers"] = json.loads(chunk["page_numbers"])
                results.append(chunk)

            return results


async def delete_chunks(doc_id: str) -> int:
    """删除文档的所有分块（级联删除）"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
        await db.commit()
        return cursor.rowcount


# ==================== 索引操作 ====================


async def save_index(index_data: dict) -> None:
    """保存索引记录"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO indices (
                id, doc_id, collection_name, strategy, chunk_type,
                chunk_count, status, embedding_model, build_time_seconds,
                completed_at
            ) VALUES (
                :id, :doc_id, :collection_name, :strategy, :chunk_type,
                :chunk_count, :status, :embedding_model, :build_time_seconds,
                :completed_at
            )
        """, index_data)
        await db.commit()


async def get_indices(doc_id: str) -> list[dict]:
    """获取文档的索引列表"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM indices WHERE doc_id = ?", (doc_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def optimize_db() -> None:
    """优化数据库"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("VACUUM")
        await db.execute("ANALYZE")
        await db.commit()

    logger.info("Database optimized")