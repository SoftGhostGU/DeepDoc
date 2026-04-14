"""索引相关数据模型"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class IndexStrategy(str, Enum):
    """索引策略"""
    HIERARCHICAL = "hierarchical"
    NAIVE = "naive"
    SEMANTIC = "semantic"


class ChunkType(str, Enum):
    """分块类型"""
    SECTION = "section"
    PARAGRAPH = "paragraph"
    SENTENCE = "sentence"


class Granularity(str, Enum):
    """向量粒度"""
    DETAIL = "detail"  # 细节向量
    SUMMARY = "summary"  # 摘要向量


class Chunk(BaseModel):
    """分块模型"""
    id: str = Field(description="分块唯一标识")
    doc_id: str = Field(description="所属文档ID")
    content: str = Field(description="分块内容")
    chunk_type: ChunkType = Field(description="分块类型")
    granularity: Granularity = Field(default=Granularity.DETAIL, description="向量粒度")
    section_id: Optional[str] = Field(default=None, description="所属章节ID")
    page_numbers: list[int] = Field(default_factory=list, description="页码列表")
    position: int = Field(description="在文档中的位置")
    char_count: int = Field(description="字符数")
    vector: Optional[list[float]] = Field(default=None, description="向量嵌入")

    model_config = {"from_attributes": True}


class IndexStats(BaseModel):
    """索引统计信息"""
    total_chunks: int = Field(description="总分块数")
    section_chunks: int = Field(description="章节级分块数")
    paragraph_chunks: int = Field(description="段落级分块数")
    sentence_chunks: int = Field(description="句子级分块数")
    summary_chunks: int = Field(default=0, description="摘要分块数")
    index_size_bytes: int = Field(description="索引大小 (bytes)")
    build_time_seconds: float = Field(description="构建耗时 (秒)")
    embedding_model: str = Field(description="使用的Embedding模型")

    model_config = {"from_attributes": True}


class IndexRecord(BaseModel):
    """索引记录"""
    id: str = Field(description="记录唯一标识")
    doc_id: str = Field(description="文档ID")
    strategy: IndexStrategy = Field(description="索引策略")
    chunk_type: ChunkType = Field(description="分块类型")
    chunk_count: int = Field(description="分块数量")
    status: str = Field(description="状态: building/ready/failed")
    stats: IndexStats = Field(description="统计信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")

    model_config = {"from_attributes": True}


class IndexRequest(BaseModel):
    """索引构建请求"""
    doc_id: str = Field(description="文档ID")
    strategies: list[IndexStrategy] = Field(
        default_factory=lambda: [IndexStrategy.HIERARCHICAL],
        description="构建策略列表"
    )


class IndexResponse(BaseModel):
    """索引构建响应"""
    doc_id: str = Field(description="文档ID")
    indices: list[IndexRecord] = Field(description="构建的索引列表")
    build_time: float = Field(description="总构建耗时 (秒)")

    model_config = {"from_attributes": True}