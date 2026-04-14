"""文档数据结构模型"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    """文档处理状态"""
    PENDING = "pending"
    PARSING = "parsing"
    INDEXING = "indexing"
    READY = "ready"
    FAILED = "failed"


class DocumentFormat(str, Enum):
    """文档格式"""
    PDF = "pdf"
    MARKDOWN = "md"
    TEXT = "txt"


class Paragraph(BaseModel):
    """段落模型 - 包含热力图定位所需属性"""
    id: str = Field(description="段落唯一标识")
    content: str = Field(description="段落内容")
    page: int = Field(description="所在页码")
    position: int = Field(description="在文档中的位置顺序")
    section_id: Optional[str] = Field(default=None, description="所属章节ID")

    # 热力图定位属性
    x: float = Field(default=0, description="X 坐标")
    y: float = Field(default=0, description="Y 坐标")
    width: float = Field(default=0, description="宽度")
    height: float = Field(default=0, description="高度")

    # 文本统计
    char_count: int = Field(description="字符数")
    word_count: int = Field(description="词数")

    model_config = {"from_attributes": True}


class Section(BaseModel):
    """章节模型 - 树形结构"""
    id: str = Field(description="章节唯一标识")
    title: str = Field(description="章节标题")
    level: int = Field(description="章节层级 (1-n)", ge=1, le=10)
    parent_id: Optional[str] = Field(default=None, description="父章节ID")
    children: list["Section"] = Field(default_factory=list, description="子章节")
    paragraphs: list[Paragraph] = Field(default_factory=list, description="章节内段落")

    # 页码范围
    start_page: int = Field(description="起始页码", ge=1)
    end_page: int = Field(description="结束页码", ge=1)

    # 摘要
    summary: Optional[str] = Field(default=None, description="章节摘要")

    model_config = {"from_attributes": True}


class DocumentMetadata(BaseModel):
    """文档元数据"""
    id: str = Field(description="文档唯一标识")
    title: str = Field(description="文档标题")
    format: DocumentFormat = Field(description="文档格式")
    status: DocumentStatus = Field(default=DocumentStatus.PENDING, description="处理状态")
    file_path: str = Field(description="文件路径")
    file_size: int = Field(description="文件大小 (bytes)")
    page_count: int = Field(default=0, description="页数")
    char_count: int = Field(default=0, description="总字符数")
    word_count: int = Field(default=0, description="总词数")
    paragraph_count: int = Field(default=0, description="段落数")
    section_count: int = Field(default=0, description="章节数")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    error_message: Optional[str] = Field(default=None, description="错误信息")

    model_config = {"from_attributes": True}


class Document(BaseModel):
    """完整文档模型"""
    metadata: DocumentMetadata = Field(description="文档元数据")
    sections: list[Section] = Field(default_factory=list, description="章节列表")
    paragraphs: list[Paragraph] = Field(default_factory=list, description="段落列表")

    model_config = {"from_attributes": True}


class SectionTreeNode(BaseModel):
    """层级树节点 - 用于思维导图展示"""
    id: str = Field(description="节点唯一标识")
    title: str = Field(description="节点标题")
    level: int = Field(description="节点层级", ge=0)
    page_range: str = Field(description="页码范围 (如 '1-5')")
    children: list["SectionTreeNode"] = Field(default_factory=list, description="子节点")
    summary: Optional[str] = Field(default=None, description="章节摘要")
    paragraph_count: int = Field(default=0, description="段落数量")

    model_config = {"from_attributes": True}


class DocumentStructure(BaseModel):
    """文档结构 - 包含层级树和段落列表"""
    doc_id: str = Field(description="文档ID")
    title: str = Field(description="文档标题")
    page_count: int = Field(description="总页数")
    tree: Optional[SectionTreeNode] = Field(default=None, description="层级树")
    paragraphs: list[Paragraph] = Field(default_factory=list, description="段落列表")

    model_config = {"from_attributes": True}


# Forward references
Section.model_rebuild()
SectionTreeNode.model_rebuild()