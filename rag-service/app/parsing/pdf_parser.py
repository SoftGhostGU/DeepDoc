"""PDF parser using PyMuPDF."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import fitz

from app.core import logger
from app.models import DocumentStructure, Paragraph, Section, SectionTreeNode
from app.parsing.base import ParseResult, ParsingStrategy
from app.text_normalization import normalize_extracted_text


@dataclass
class HeadingBlock:
    text: str
    level: int
    page: int
    y: float
    font_size: float = 0
    is_bold: bool = False


@dataclass
class TextBlock:
    text: str
    page: int
    y: float
    x: float = 0
    width: float = 0
    height: float = 0


class PDFParser(ParsingStrategy):
    def __init__(
        self,
        title_font_sizes: tuple = (18, 16, 14, 12),
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
        try:
            self.validate_file(file_path)
            logger.info(f"Parsing PDF: {file_path}")

            doc = fitz.open(file_path)
            heading_blocks = self._extract_headings(doc)
            text_blocks = self._extract_text_blocks(doc)
            sections, paragraphs = self._build_structure(heading_blocks, text_blocks, doc.page_count)

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
        except Exception as exc:
            logger.exception(f"Failed to parse PDF: {file_path}")
            return ParseResult(
                structure=DocumentStructure(
                    doc_id=file_path.stem,
                    title=file_path.stem,
                    page_count=0,
                ),
                success=False,
                error_message=str(exc),
            )

    def _extract_title(self, doc: fitz.Document) -> str:
        metadata = doc.metadata
        if metadata.get("title"):
            return normalize_extracted_text(metadata["title"])

        if doc.page_count > 0:
            page = doc[0]
            text = page.get_text("text")
            lines = text.split("\n")
            for line in lines[:5]:
                stripped = line.strip()
                if stripped and len(stripped) < 100:
                    return normalize_extracted_text(stripped)[:100]

        return doc.filename or "Untitled"

    def _extract_headings(self, doc: fitz.Document) -> list[HeadingBlock]:
        headings: list[HeadingBlock] = []

        for page_num, page in enumerate(doc):
            text_dict = page.get_text("dict")
            blocks = text_dict.get("blocks", [])

            for block in blocks:
                if block.get("type") != 0:
                    continue

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = normalize_extracted_text(span.get("text", "").strip())
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
        if not text or len(text) < self.min_title_length:
            return False
        if len(text) > self.max_title_length:
            return False

        if re.match(r"^\d+(\.\d+)*$", text):
            return False
        if re.match(r"^第\d+页?$", text):
            return False

        if font_size >= self.title_font_sizes[0]:
            return True
        if font_size >= self.title_font_sizes[1] and is_bold:
            return True

        chapter_patterns = [
            r"^第[一二三四五六七八九十\d]+[章节篇部分卷]\s*",
            r"^[0-9]+\.\s*",
            r"^[A-Z]\.\s*",
            r"^第\d+节\s*",
        ]
        return any(re.match(pattern, text) for pattern in chapter_patterns)

    def _detect_title_level(self, font_size: float, is_bold: bool) -> int:
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
        blocks: list[TextBlock] = []

        for page_num, page in enumerate(doc):
            text_dict = page.get_text("dict")
            page_blocks = text_dict.get("blocks", [])

            for block in page_blocks:
                if block.get("type") != 0:
                    continue

                bbox = block.get("bbox", (0, 0, 0, 0))
                text = ""
                last_span = None

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        last_span = span
                        text += span.get("text", "")

                text = normalize_extracted_text(text)
                if not text:
                    continue

                if last_span and self._is_title(
                    text,
                    last_span.get("size", 0),
                    bool(last_span.get("flags", 0) & 2),
                ):
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
        sections: list[Section] = []
        paragraphs: list[Paragraph] = []

        if not headings:
            for idx, block in enumerate(text_blocks):
                paragraph = Paragraph(
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
                paragraphs.append(paragraph)

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

        ordered_headings = sorted(headings, key=lambda heading: (heading.page, heading.y))
        ordered_blocks = sorted(text_blocks, key=lambda block: (block.page, block.y, block.x))

        sections = self._build_sections_from_headings(ordered_headings)
        front_matter: Optional[Section] = None
        para_idx = 0
        heading_index = 0
        current_section: Optional[Section] = None

        for block in ordered_blocks:
            while heading_index < len(ordered_headings) and self._heading_precedes_block(
                ordered_headings[heading_index],
                block,
            ):
                current_section = sections[heading_index]
                heading_index += 1

            target_section = current_section
            if target_section is None:
                if front_matter is None:
                    front_matter = Section(
                        id="sec_front_matter",
                        title="前置内容",
                        level=1,
                        start_page=block.page,
                        end_page=block.page,
                        paragraphs=[],
                    )
                target_section = front_matter

            paragraph = Paragraph(
                id=f"p_{para_idx + 1}",
                content=block.text,
                page=block.page,
                position=para_idx,
                section_id=target_section.id,
                x=block.x,
                y=block.y,
                width=block.width,
                height=block.height,
                char_count=len(block.text),
                word_count=len(block.text.split()),
            )
            target_section.paragraphs.append(paragraph)
            target_section.end_page = max(target_section.end_page, block.page)
            paragraphs.append(paragraph)
            para_idx += 1

        if front_matter is not None:
            sections.insert(0, front_matter)

        self._finalize_section_ranges(sections)
        return sections, paragraphs

    def _build_sections_from_headings(self, headings: list[HeadingBlock]) -> list[Section]:
        sections: list[Section] = []
        parent_stack: list[Section] = []

        for index, heading in enumerate(headings, start=1):
            section = Section(
                id=f"sec_{index}",
                title=heading.text,
                level=heading.level,
                start_page=heading.page,
                end_page=heading.page,
                paragraphs=[],
            )

            while parent_stack and parent_stack[-1].level >= heading.level:
                parent_stack.pop()

            if parent_stack:
                section.parent_id = parent_stack[-1].id
                parent_stack[-1].children.append(section)

            parent_stack.append(section)
            sections.append(section)

        return sections

    def _heading_precedes_block(self, heading: HeadingBlock, block: TextBlock) -> bool:
        return heading.page < block.page or (
            heading.page == block.page and heading.y < block.y
        )

    def _finalize_section_ranges(self, sections: list[Section]) -> None:
        def section_end_page(section: Section) -> int:
            direct_pages = [paragraph.page for paragraph in section.paragraphs]
            child_pages = [
                section_end_page(candidate)
                for candidate in sections
                if candidate.parent_id == section.id
            ]
            section.end_page = max(
                [section.start_page, section.end_page, *direct_pages, *child_pages]
            )
            return section.end_page

        for section in sections:
            if section.parent_id is None:
                section_end_page(section)

    def _build_tree_node(self, sections: list[Section]) -> SectionTreeNode:
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
            paragraph_count=sum(len(section.paragraphs) for section in sections),
        )

        def build_children(parent_id: Optional[str]) -> list[SectionTreeNode]:
            children = []
            for section in sections:
                if section.parent_id == parent_id:
                    node = SectionTreeNode(
                        id=section.id,
                        title=section.title,
                        level=section.level,
                        page_range=(
                            f"{section.start_page}-{section.end_page}"
                            if section.start_page != section.end_page
                            else str(section.start_page)
                        ),
                        summary=section.summary,
                        paragraph_count=len(section.paragraphs),
                        children=build_children(section.id),
                    )
                    children.append(node)
            return children

        root.children = build_children(None)
        return root
