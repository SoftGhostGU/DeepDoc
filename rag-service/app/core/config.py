"""Application settings using pydantic-settings."""

from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    # App basics
    app_name: str = "DeepDoc RAG Service"
    app_version: str = "0.1.0"
    app_description: str = "Hierarchical RAG backend for long documents"
    debug: bool = False

    # Service
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["*"]

    # LLM
    llm_api_key: Optional[str] = None
    llm_base_url: str = "https://api.minimax.chat/v1"
    llm_model: str = "MiniMax-Text-01"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096
    llm_group_id: Optional[str] = None

    # Vector DB / Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_grpc_port: int = 6334
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None
    qdrant_distance: str = "Cosine"
    qdrant_collection: str = "deepdoc_chunks"
    vector_dimension: int = 1024

    # Embedding
    embedding_model: str = "bge-large-zh-v1.5"
    embedding_batch_size: int = 32
    embedding_api_key: Optional[str] = None
    embedding_base_url: Optional[str] = None

    # Retrieval behavior
    rerank_enabled: bool = False

    # Model cache
    model_cache_dir: str = "F:/Program/DeepDoc/.cache"

    # Logging
    log_level: str = "INFO"
    log_format: str = "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}"
    log_rotation: str = "100 MB"
    log_retention: str = "7 days"

    # File
    upload_dir: str = "./uploads"
    max_file_size: int = 200 * 1024 * 1024
    allowed_extensions: list[str] = [".pdf", ".md", ".txt"]

    # Indexing
    chunk_size: int = 512
    chunk_overlap: int = 50
    summary_model: Optional[str] = None

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        valid_levels = ["TRACE", "DEBUG", "INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"]
        upper = value.upper()
        if upper not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return upper


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
