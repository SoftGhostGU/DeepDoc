"""通用响应模型"""
from typing import Any, Optional

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """错误详情"""
    field: Optional[str] = Field(default=None, description="出错的字段")
    message: str = Field(description="错误信息")
    code: Optional[str] = Field(default=None, description="错误代码")


class AppError(BaseModel):
    """应用错误响应"""
    code: str = Field(description="错误代码")
    message: str = Field(description="错误消息")
    detail: Optional[Any] = Field(default=None, description="详细错误信息")


class SuccessResponse(BaseModel):
    """通用成功响应"""
    success: bool = Field(default=True, description="是否成功")
    message: Optional[str] = Field(default=None, description="成功消息")
    data: Optional[Any] = Field(default=None, description="响应数据")


class ParseResponse(BaseModel):
    """文档解析响应"""
    doc_id: str = Field(description="文档ID")
    structure_tree: dict = Field(description="结构树 JSON")
    stats: dict = Field(description="统计信息")


class TreeResponse(BaseModel):
    """层级树响应"""
    tree: dict = Field(description="层级树 JSON")


class ParagraphsResponse(BaseModel):
    """段落列表响应"""
    paragraphs: list[dict] = Field(description="段落列表")
    total: int = Field(description="总数")
    page_count: int = Field(description="页数")


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = Field(description="服务状态")
    version: str = Field(description="版本号")
    uptime: float = Field(description="运行时间 (秒)")