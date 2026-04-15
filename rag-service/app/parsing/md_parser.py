"""Markdown 解析器"""
import re
from pathlib import Path
from typing import Optional

from app.core import logger
from app.models import (
    DocumentStructure,
    Paragraph,
    Section,
    SectionTreeNode,
)
from app.parsing.base import ParseResult, ParsingStrategy


class MarkdownParser(ParsingStrategy):
    """Markdown 解析器

    核心功能：
    1. 根据 # 数量精准还原 H1-H6 层级
    2. 支持代码块、列表等 Markdown 元素
    3. 保持与 PDF 相同的输出格式
    """

    # 匹配 Markdown 标题
    HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

    def __init__(self):
        pass

    @property
    def supported_formats(self) -> list[str]:
        return [".md", ".markdown"]

    async def parse(self, file_path: Path) -> ParseResult:
        """解析 Markdown 文件"""
        try:
            self.validate_file(file_path)
            logger.info(f"Parsing Markdown: {file_path}")

            # 读取内容
            content = file_path.read_text(encoding="utf-8")

            # 提取标题和段落
            headings = self._extract_headings(content)
            paragraphs = self._extract_paragraphs(content)

            # 构建结构
            sections = self._build_sections(headings, paragraphs)
            tree = self._build_tree_node(sections)

            structure = DocumentStructure(
                doc_id=file_path.stem,
                title=file_path.stem,
                page_count=1,
                tree=tree,
                paragraphs=paragraphs,
            )

            logger.info(
                f"Parsed Markdown: {structure.doc_id}, "
                f"sections={len(sections)}, "
                f"paragraphs={len(paragraphs)}"
            )

            return ParseResult(structure=structure, success=True)

        except Exception as e:
            logger.exception(f"Failed to parse Markdown: {file_path}")
            return ParseResult(
                structure=DocumentStructure(
                    doc_id=file_path.stem,
                    title=file_path.stem,
                    page_count=0,
                ),
                success=False,
                error_message=str(e),
            )

    def _extract_headings(self, content: str) -> list[tuple]:
        """提取标题"""
        headings = []
        for match in self.HEADING_PATTERN.finditer(content):
            level = len(match.group(1))
            text = match.group(2).strip()
            headings.append((level, text))
        return headings

    def _extract_paragraphs(self, content: str) -> list[Paragraph]:
        """提取段落"""
        paragraphs = []
        lines = content.split("\n")
        current_para: list[str] = []
        position = 0
        in_code_block = False

        for line in lines:
            # 代码块处理
            if line.strip().startswith("```"):
                in_code_block = not in_code_block
                continue

            if in_code_block:
                continue

            line = line.rstrip()

            # 空行表示段落结束
            if not line:
                if current_para:
                    text = " ".join(current_para)
                    paragraphs.append(
                        Paragraph(
                            id=f"p_{position + 1}",
                            content=text,
                            page=1,
                            position=position,
                            char_count=len(text),
                            word_count=len(text.split()),
                        )
                    )
                    position += 1
                    current_para = []
                continue

            # 跳过标题行
            if self.HEADING_PATTERN.match(line):
                continue

            current_para.append(line)

        # 最后一个段落
        if current_para:
            text = " ".join(current_para)
            paragraphs.append(
                Paragraph(
                    id=f"p_{position + 1}",
                    content=text,
                    page=1,
                    position=position,
                    char_count=len(text),
                    word_count=len(text.split()),
                )
            )

        return paragraphs

    def _build_sections(
        self,
        headings: list[tuple],
        paragraphs: list[Paragraph],
    ) -> list[Section]:
        """构建章节"""
        if not headings and paragraphs:
            return [
                Section(
                    id="sec_1",
                    title="Document",
                    level=1,
                    paragraphs=paragraphs[:],
                    start_page=1,
                    end_page=1,
                )
            ]

        # Create a section for each heading
        sections = []
        for idx, (level, title) in enumerate(headings):
            section = Section(
                id=f"sec_{idx + 1}",
                title=title,
                level=level,
                start_page=1,
                end_page=1,
                paragraphs=[],
            )
            sections.append(section)

        # Assign each paragraph to the last heading that appears BEFORE its position
        for para in paragraphs:
            # Find the last heading whose position is <= paragraph position
            section_idx = -1
            for i, heading in enumerate(headings):
                if i <= para.position:
                    section_idx = i
            if section_idx >= 0:
                para.section_id = sections[section_idx].id
                sections[section_idx].paragraphs.append(para)

        # Set parent relationships
        for i, section in enumerate(sections):
            for j in range(i - 1, -1, -1):
                if sections[j].level < section.level:
                    section.parent_id = sections[j].id
                    break

        return sections

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
            page_range="1",
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
                        page_range=str(sec.start_page),
                        summary=sec.summary,
                        paragraph_count=len(sec.paragraphs),
                        children=build_children(sec.id),
                    )
                    children.append(node)
            return children

        root.children = build_children(None)
        return root