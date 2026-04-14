"""配置文件 - 使用 pydantic-settings 实现配置中心"""
from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    # ==================== 项目基础配置 ====================
    app_name: str = "DeepDoc RAG Service"
    app_version: str = "0.1.0"
    app_description: str = "面向长文档的层级 RAG 系统"
    debug: bool = False

    # ==================== 服务配置 ====================
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["*"]

    # ==================== LLM 配置 ====================
    llm_api_key: Optional[str] = None
    llm_base_url: str = "https://api.minimax.chat/v1"
    llm_model: str = "MiniMax-Text-01"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096
    llm_group_id: Optional[str] = None  # MiniMax 特定

    # ==================== 向量库配置 ====================
    # Qdrant 配置 (可选，需要 Docker)
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_grpc_port: int = 6334
    qdrant_api_key: Optional[str] = None
    qdrant_distance: str = "Cosine"
    vector_dimension: int = 1024  # bge-large-zh-v1.5

    # ==================== Embedding 配置 ====================
    embedding_model: str = "bge-large-zh-v1.5"
    embedding_batch_size: int = 32

    # ==================== 日志配置 ====================
    log_level: str = "INFO"
    log_format: str = "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}"
    log_rotation: str = "100 MB"
    log_retention: str = "7 days"

    # ==================== 文件配置 ====================
    upload_dir: str = "./uploads"
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_extensions: list[str] = [".pdf", ".md", ".txt"]

    # ==================== 索引配置 ====================
    chunk_size: int = 512
    chunk_overlap: int = 50
    summary_model: Optional[str] = None  # 用于生成摘要的模型，默认使用主模型

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["TRACE", "DEBUG", "INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v_upper


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()