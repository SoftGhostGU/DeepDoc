"""纯文本文档解析器"""
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


class TextParser(ParsingStrategy):
    """纯文本文档解析器

    核心功能：
    1. 按行/段落切分
    2. 自动检测标题（整行大写或特定格式）
    3. 用于没有格式的原始文本
    """

    def __init__(
        self,
        min_paragraph_len: int = 10,
    ):
        self.min_paragraph_len = min_paragraph_len

    @property
    def supported_formats(self) -> list[str]:
        return [".txt", ".text"]

    async def parse(self, file_path: Path) -> ParseResult:
        """解析文本文件"""
        try:
            self.validate_file(file_path)
            logger.info(f"Parsing Text: {file_path}")

            # 读取内容
            content = file_path.read_text(encoding="utf-8")

            # 按段落切分
            paragraphs = self._split_paragraphs(content)
            sections = self._build_sections(paragraphs)
            tree = self._build_tree_node(sections)

            total_chars = sum(p.char_count for p in paragraphs)
            total_words = sum(p.word_count for p in paragraphs)

            structure = DocumentStructure(
                doc_id=file_path.stem,
                title=self._extract_title(content),
                page_count=1,
                tree=tree,
                paragraphs=paragraphs,
            )

            logger.info(
                f"Parsed Text: {structure.doc_id}, "
                f"sections={len(sections)}, "
                f"paragraphs={len(paragraphs)}"
            )

            return ParseResult(structure=structure, success=True)

        except Exception as e:
            logger.exception(f"Failed to parse Text: {file_path}")
            return ParseResult(
                structure=DocumentStructure(
                    doc_id=file_path.stem,
                    title=file_path.stem,
                    page_count=0,
                ),
                success=False,
                error_message=str(e),
            )

    def _extract_title(self, content: str) -> str:
        """提取标题（第一行非空行）"""
        lines = content.split("\n")
        for line in lines:
            line = line.strip()
            if line:
                return line[:100]
        return "Untitled"

    def _split_paragraphs(self, content: str) -> list[Paragraph]:
        """按段落切分"""
        paragraphs = []
        lines = content.split("\n")
        current_block: list[str] = []
        position = 0

        for line in lines:
            line = line.strip()

            # 空行分割段落
            if not line:
                if current_block:
                    text = " ".join(current_block)
                    if len(text) >= self.min_paragraph_len:
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
                    current_block = []
                continue

            # 跳过可能的标题行（全大写且短）
            if line.isupper() and len(line) < 50:
                continue

            current_block.append(line)

        # 最后一段
        if current_block:
            text = " ".join(current_block)
            if len(text) >= self.min_paragraph_len:
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

        # 无有效段落时使用整个内容
        if not paragraphs:
            text = content.strip()
            if text:
                paragraphs.append(
                    Paragraph(
                        id="p_1",
                        content=text[:1000],
                        page=1,
                        position=0,
                        char_count=len(text[:1000]),
                        word_count=len(text[:1000].split()),
                    )
                )

        return paragraphs

    def _build_sections(self, paragraphs: list[Paragraph]) -> list[Section]:
        """构建章节"""
        if not paragraphs:
            return []

        # 创建一个默认章节包含所有段落
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

    def _build_tree_node(self, sections: list[Section]) -> SectionTreeNode:
        """构建树节点"""
        if not sections:
            return SectionTreeNode(
                id="root",
                title="Document",
                level=0,
                page_range="1",
            )

        return SectionTreeNode(
            id="root",
            title="Document",
            level=0,
            page_range="1",
            paragraph_count=sum(len(s.paragraphs) for s in sections),
        )