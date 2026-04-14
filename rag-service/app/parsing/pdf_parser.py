"""PDF 解析器 - 使用 PyMuPDF (fitz)"""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

from app.core import logger
from app.models import (
    DocumentStructure,
    Paragraph,
    Section,
    SectionTreeNode,
)
from app.parsing.base import ParseResult, ParsingStrategy


@dataclass
class HeadingBlock:
    """标题块"""
    text: str
    level: int
    page: int
    y: float  # Y 坐标用于排序
    font_size: float = 0
    is_bold: bool = False


@dataclass
class TextBlock:
    """文本块"""
    text: str
    page: int
    y: float
    x: float = 0
    width: float = 0
    height: float = 0


class PDFParser(ParsingStrategy):
    """PDF 文档解析器

    核心功能：
    1. 使用 PyMuPDF 提取文本和坐标
    2. 根据字体大小/加粗/TOC 识别章节标题
    3. 重构为树形章节结构
    """

    def __init__(
        self,
        title_font_sizes: tuple = (18, 16, 14, 12),  # H1-H4 预期字号
        min_title_length: int = 3,
        max_title_length: int = 200,
    ):
        self.title_font_sizes = title_font_sizes
        self.min_title_length = min_title_length
        self.max_title_length = max_title_length

    @property
    def supported_formats(self) -> list[str]:
        return [".pdf"]

    async def parse(self, file_path: Path) -> ParseResult:
        """解析 PDF 文件"""
        try:
            self.validate_file(file_path)
            logger.info(f"Parsing PDF: {file_path}")

            # 打开 PDF
            doc = fitz.open(file_path)

            # 提取标题块和文本块
            heading_blocks = self._extract_headings(doc)
            text_blocks = self._extract_text_blocks(doc)

            # 构建章节树
            sections, paragraphs = self._build_structure(heading_blocks, text_blocks, doc.page_count)

            # 创建文档结构
            structure = DocumentStructure(
                doc_id=file_path.stem,
                title=self._extract_title(doc),
                page_count=doc.page_count,
                tree=self._build_tree_node(sections) if sections else None,
                paragraphs=paragraphs,
            )

            doc.close()

            logger.info(
                f"Parsed PDF: {structure.doc_id}, "
                f"pages={structure.page_count}, "
                f"sections={len(sections)}, "
                f"paragraphs={len(paragraphs)}"
            )

            return ParseResult(structure=structure, success=True)

        except Exception as e:
            logger.exception(f"Failed to parse PDF: {file_path}")
            return ParseResult(
                structure=DocumentStructure(
                    doc_id=file_path.stem,
                    title=file_path.stem,
                    page_count=0,
                ),
                success=False,
                error_message=str(e),
            )

    def _extract_title(self, doc: fitz.Document) -> str:
        """提取文档标题"""
        # 从元数据获取
        metadata = doc.metadata
        if metadata.get("title"):
            return metadata["title"]

        # 从第一页提取
        if doc.page_count > 0:
            page = doc[0]
            text = page.get_text("text")
            lines = text.split("\n")
            for line in lines[:5]:
                line = line.strip()
                if line and len(line) < 100:
                    return line[:100]

        return doc.filename or "Untitled"

    def _extract_headings(self, doc: fitz.Document) -> list[HeadingBlock]:
        """提取标题块"""
        headings: list[HeadingBlock] = []

        for page_num, page in enumerate(doc):
            text_dict = page.get_text("dict")
            blocks = text_dict.get("blocks", [])

            for block in blocks:
                if block.get("type") != 0:
                    continue

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue

                        font_size = span.get("size", 0)
                        flags = span.get("flags", 0)
                        is_bold = bool(flags & 2)

                        if self._is_title(text, font_size, is_bold):
                            level = self._detect_title_level(font_size, is_bold)
                            bbox = block.get("bbox", (0, 0, 0, 0))
                            headings.append(
                                HeadingBlock(
                                    text=text,
                                    level=level,
                                    page=page_num + 1,
                                    y=bbox[1],
                                    font_size=font_size,
                                    is_bold=is_bold,
                                )
                            )

        return headings

    def _is_title(self, text: str, font_size: float, is_bold: bool) -> bool:
        """判断是否为标题"""
        if not text or len(text) < self.min_title_length:
            return False
        if len(text) > self.max_title_length:
            return False

        # 排除页码
        if re.match(r"^\d+(\.\d+)*$", text):
            return False
        if re.match(r"^第\d+页$", text):
            return False

        # 字体大小检查
        if font_size >= self.title_font_sizes[0]:
            return True
        if font_size >= self.title_font_sizes[1] and is_bold:
            return True

        # 章节模式匹配
        chapter_patterns = [
            r"^第[一二三四五六七八九十\d]+[章节篇部卷]\s*",
            r"^[0-9]+\.\s*",
            r"^[A-Z]\.\s*",
            r"^第\d+节\s*",
        ]
        for pattern in chapter_patterns:
            if re.match(pattern, text):
                return True

        return False

    def _detect_title_level(self, font_size: float, is_bold: bool) -> int:
        """检测标题级别"""
        if font_size >= 24:
            return 1
        if font_size >= self.title_font_sizes[0]:
            return 1
        if font_size >= self.title_font_sizes[1]:
            return 2
        if font_size >= self.title_font_sizes[2]:
            return 3
        if font_size >= self.title_font_sizes[3]:
            return 4
        return 5

    def _extract_text_blocks(self, doc: fitz.Document) -> list[TextBlock]:
        """提取文本块"""
        blocks: list[TextBlock] = []

        for page_num, page in enumerate(doc):
            text_dict = page.get_text("dict")
            page_blocks = text_dict.get("blocks", [])

            for block in page_blocks:
                if block.get("type") != 0:
                    continue

                bbox = block.get("bbox", (0, 0, 0, 0))
                text = ""

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text += span.get("text", "")

                text = text.strip()
                if not text:
                    continue

                # 跳过标题
                if self._is_title(text, span.get("size", 0), bool(span.get("flags", 0) & 2)):
                    continue

                blocks.append(
                    TextBlock(
                        text=text,
                        page=page_num + 1,
                        y=bbox[1],
                        x=bbox[0],
                        width=bbox[2] - bbox[0],
                        height=bbox[3] - bbox[1],
                    )
                )

        return blocks

    def _build_structure(
        self,
        headings: list[HeadingBlock],
        text_blocks: list[TextBlock],
        page_count: int,
    ) -> tuple[list[Section], list[Paragraph]]:
        """构建文档结构"""
        sections: list[Section] = []
        paragraphs: list[Paragraph] = []

        if not headings:
            # 无标题：按段落切分
            for idx, block in enumerate(text_blocks):
                para = Paragraph(
                    id=f"p_{idx + 1}",
                    content=block.text,
                    page=block.page,
                    position=idx,
                    x=block.x,
                    y=block.y,
                    width=block.width,
                    height=block.height,
                    char_count=len(block.text),
                    word_count=len(block.text.split()),
                )
                paragraphs.append(para)

            if paragraphs:
                sections.append(
                    Section(
                        id="sec_1",
                        title="Document",
                        level=1,
                        paragraphs=paragraphs[:],
                        start_page=1,
                        end_page=page_count,
                    )
                )
            return sections, paragraphs

        # 按标题分组
        current_section: Optional[Section] = None
        section_paragraphs: list[Paragraph] = []
        para_idx = 0
        last_page = 1

        for heading in headings:
            # 保存前一个章节
            if current_section and section_paragraphs:
                current_section.paragraphs = section_paragraphs[:]
                current_section.end_page = section_paragraphs[-1].page

            section_paragraphs = []

            # 收集该标题下的段落
            for block in text_blocks:
                if block.page < heading.page:
                    continue
                if block.page == heading.page and block.y <= heading.y:
                    continue
                if block.page > heading.page and section_paragraphs:
                    last_page = block.page
                    break

                para = Paragraph(
                    id=f"p_{para_idx + 1}",
                    content=block.text,
                    page=block.page,
                    position=para_idx,
                    section_id=f"sec_{len(sections) + 1}",
                    x=block.x,
                    y=block.y,
                    width=block.width,
                    height=block.height,
                    char_count=len(block.text),
                    word_count=len(block.text.split()),
                )
                section_paragraphs.append(para)
                paragraphs.append(para)
                para_idx += 1

            # 创建章节
            section = Section(
                id=f"sec_{len(sections) + 1}",
                title=heading.text,
                level=heading.level,
                start_page=heading.page,
                end_page=heading.page,
                paragraphs=section_paragraphs[:],
            )

            # 父子��系
            if sections and heading.level > sections[-1].level:
                section.parent_id = sections[-1].id
                sections[-1].children.append(section)

            sections.append(section)
            current_section = section

        # 最后一个章节的后续段落
        if current_section:
            remaining = [b for b in text_blocks if b.page >= headings[-1].page]
            for block in remaining:
                para = Paragraph(
                    id=f"p_{para_idx + 1}",
                    content=block.text,
                    page=block.page,
                    position=para_idx,
                    section_id=current_section.id,
                    x=block.x,
                    y=block.y,
                    width=block.width,
                    height=block.height,
                    char_count=len(block.text),
                    word_count=len(block.text.split()),
                )
                current_section.paragraphs.append(para)
                paragraphs.append(para)
                para_idx += 1
                current_section.end_page = block.page

        return sections, paragraphs

    def _build_tree_node(self, sections: list[Section]) -> SectionTreeNode:
        """构建树节点"""
        if not sections:
            return SectionTreeNode(
                id="root",
                title="Document",
                level=0,
                page_range="1",
            )

        root = SectionTreeNode(
            id="root",
            title="Document",
            level=0,
            page_range=f"1-{sections[-1].end_page}",
            paragraph_count=sum(len(s.paragraphs) for s in sections),
        )

        def build_children(parent_id: Optional[str]) -> list[SectionTreeNode]:
            children = []
            for sec in sections:
                if sec.parent_id == parent_id:
                    node = SectionTreeNode(
                        id=sec.id,
                        title=sec.title,
                        level=sec.level,
                        page_range=f"{sec.start_page}-{sec.end_page}" if sec.start_page != sec.end_page else str(sec.start_page),
                        summary=sec.summary,
                        paragraph_count=len(sec.paragraphs),
                        children=build_children(sec.id),
                    )
                    children.append(node)
            return children

        root.children = build_children(None)
        return root