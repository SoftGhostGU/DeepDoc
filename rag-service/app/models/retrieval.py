"""检索相关数据模型"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class SearchPathType(str, Enum):
    """检索路径类型"""
    SUMMARY = "summary"  # 摘要匹配
    DETAIL = "detail"  # 全文匹配
    SEMANTIC = "semantic"  # 语义匹配


class SearchPathStep(BaseModel):
    """检索路径步骤 - 记录 AI 检索时的跳转逻辑"""
    node_id: str = Field(description="对应的章节或段落 ID")
    score: float = Field(description="相似度分数 (0-1)")
    reason: str = Field(description="为什么命中该节点")
    type: SearchPathType = Field(description="匹配类型")
    granularity: Optional[str] = Field(default=None, description="向量粒度 (detail/summary)")
    page: Optional[int] = Field(default=None, description="所在页码")

    model_config = {"from_attributes": True}


class RetrievalPath(BaseModel):
    """完整的检索路径"""
    query: str = Field(description="用户查询")
    steps: list[SearchPathStep] = Field(default_factory=list, description="检索步骤列表")
    total_score: float = Field(description="综合分数")
    matched_sections: int = Field(description="匹配的章节数")
    matched_paragraphs: int = Field(description="匹配的段落数")

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    """检索请求"""
    doc_id: str = Field(description="文档ID")
    query: str = Field(description="查询内容")
    mode: str = Field(default="hierarchical", description="检索模式")
    top_k: int = Field(default=5, description="返回结果数")


class SearchResponse(BaseModel):
    """检索响应"""
    results: list[dict] = Field(description="检索结果")
    path: RetrievalPath = Field(description="检索路径")
    build_time: float = Field(description="检索耗时")


# 树节点响应（用于前端思维导图）
class TreeNodeResponse(BaseModel):
    """树节点响应"""
    id: str = Field(description="节点ID")
    title: str = Field(description="节点标题")
    level: int = Field(description="节点层级 (0=根)")
    page_range: str = Field(description="页码范围")
    children: list["TreeNodeResponse"] = Field(default_factory=list, description="子节点")
    summary: Optional[str] = Field(default=None, description="章节摘要")
    paragraph_count: int = Field(default=0, description="段落数量")

    model_config = {"from_attributes": True}


class TreeResponse(BaseModel):
    """层级树响应"""
    doc_id: str = Field(description="文档ID")
    title: str = Field(description="文档标题")
    tree: Optional[TreeNodeResponse] = Field(default=None, description="树结构")

    model_config = {"from_attributes": True}


# 段落响应（用于前端热力图）
class ParagraphItem(BaseModel):
    """段落项目"""
    id: str = Field(description="段落ID")
    content: str = Field(description="段落内容 (截断)")
    page: int = Field(description="页码")
    position: int = Field(description="位置顺序")
    section_id: Optional[str] = Field(default=None, description="所属章节ID")
    char_count: int = Field(description="字符数")

    model_config = {"from_attributes": True}


class ParagraphsResponse(BaseModel):
    """段落列表响应"""
    doc_id: str = Field(description="文档ID")
    paragraphs: list[ParagraphItem] = Field(default_factory=list, description="段落列表")
    total: int = Field(description="总数")
    page_count: int = Field(description="总页数")

    model_config = {"from_attributes": True}