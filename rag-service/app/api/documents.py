"""文档相关 API 路由"""
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core import get_settings, logger, get_document, get_sections, get_chunks
from app.core.database import save_document, update_document_status, save_sections, save_chunks
from app.exceptions import AppException, ParseException
from app.models import (
    Document,
    DocumentFormat,
    DocumentMetadata,
    DocumentStatus,
    IndexRequest,
    IndexResponse,
    Paragraph,
    ParseResponse,
    SectionTreeNode,
    TreeNodeResponse,
    TreeResponse,
    ParagraphItem,
    ParagraphsResponse,
)

from app.parsing import PDFParser, MarkdownParser, TextParser
from app.parsing.base import ParsingStrategy
from app.text_normalization import normalize_extracted_text


# ==================== 路由实例 ====================

router = APIRouter()


# ==================== 解析器工厂 ====================


class ParserFactory:
    """解析器工厂"""

    _parsers: dict[str, ParsingStrategy] = {
        ".pdf": PDFParser(),
        ".md": MarkdownParser(),
        ".markdown": MarkdownParser(),
        ".txt": TextParser(),
    }

    @classmethod
    def get_parser(cls, filename: str) -> ParsingStrategy:
        """根据文件名获取解析器"""
        ext = Path(filename).suffix.lower()
        parser = cls._parsers.get(ext)
        if not parser:
            allowed = ", ".join(cls._parsers.keys())
            raise ParseException(
                code="UNSUPPORTED_FORMAT",
                message=f"Unsupported file format: {ext}",
                detail=f"Allowed: {allowed}",
            )
        return parser


# ==================== API 接口 ====================


@router.post("/parse", response_model=ParseResponse, status_code=status.HTTP_201_CREATED)
async def parse_document(file: UploadFile = File(...)) -> ParseResponse:
    """解析文档接口"""
    settings = get_settings()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    try:
        parser = ParserFactory.get_parser(file.filename or "")

        ext = Path(file.filename).suffix.lower()
        if ext not in parser.supported_formats:
            raise ParseException(
                code="UNSUPPORTED_FORMAT",
                message=f"Format not supported: {ext}",
            )

        # 保存文件（边读边写，避免大文件堆积在内存）
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / f"{doc_id}{ext}"

        max_size = settings.max_file_size
        total_size = 0
        has_content = False

        try:
            with file_path.open("wb") as output_file:
                while chunk := await file.read(1024 * 1024):
                    has_content = True
                    total_size += len(chunk)
                    if total_size > max_size:
                        raise ParseException(
                            code="FILE_TOO_LARGE",
                            message=f"File exceeds maximum size: {max_size / 1024 / 1024}MB",
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        )
                    output_file.write(chunk)
        except ParseException:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise

        if not has_content:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise ParseException(code="EMPTY_FILE", message="Empty file uploaded")

        logger.info(f"File saved: {file_path}, size={total_size} bytes")

        # 解析
        result = await parser.parse(file_path)

        if not result.success:
            await update_document_status(doc_id, "failed", result.error_message)
            raise ParseException(
                code="PARSE_ERROR",
                message="Document parsing failed",
                detail=result.error_message,
            )

        structure = result.structure

        # 保存文档元数据
        doc_data = {
            "id": doc_id,
            "title": structure.title,
            "format": ext.lstrip("."),
            "status": "ready",
            "file_path": str(file_path),
            "file_size": total_size,
            "page_count": structure.page_count,
            "char_count": sum(p.char_count for p in structure.paragraphs),
            "word_count": sum(p.word_count for p in structure.paragraphs),
            "paragraph_count": len(structure.paragraphs),
            "section_count": _count_sections(structure.tree),
        }
        await save_document(doc_data)

        # 保存章节到数据库
        if structure.tree:
            sections_data = _tree_to_sections(structure.tree, doc_id)
            await save_sections(sections_data)

        # 保存段落到数据库（作为 chunk 类型）
        paragraph_chunks = [
            {
                "id": p.id,
                "doc_id": doc_id,
                "section_id": p.section_id or None,
                "content": p.content,
                "chunk_type": "paragraph",
                "granularity": "paragraph",
                "position": p.position,
                "page_numbers": [p.page],
                "char_count": p.char_count,
                "embedding": None,
            }
            for p in structure.paragraphs
        ]
        logger.info(f"Saving {len(paragraph_chunks)} paragraphs to chunks table")
        if paragraph_chunks:
            await save_chunks(paragraph_chunks)

        response = ParseResponse(
            doc_id=doc_id,
            structure_tree=structure.model_dump()["tree"] if structure.tree else {},
            stats={
                "page_count": structure.page_count,
                "section_count": doc_data["section_count"],
                "paragraph_count": len(structure.paragraphs),
                "char_count": doc_data["char_count"],
                "word_count": doc_data["word_count"],
            },
        )

        logger.info(f"Document parsed: {doc_id}")

        return response

    except ParseException:
        raise
    except Exception as e:
        logger.exception("Failed to parse document")
        raise ParseException(
            code="PARSE_ERROR",
            message="Document parsing failed",
            detail=str(e),
        )


@router.post("/{doc_id}/index", response_model=IndexResponse)
async def build_index(doc_id: str, request: IndexRequest) -> IndexResponse:
    """构建索引接口"""
    from app.indexing.builder import IndexBuilder

    try:
        builder = IndexBuilder()
        response = await builder.build(doc_id, request)
        logger.info(f"Index built for document: {doc_id}")
        return response

    except AppException:
        raise
    except ValueError as e:
        raise AppException(
            code="DOCUMENT_NOT_FOUND",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.exception("Failed to build index")
        raise AppException(
            code="INDEX_ERROR",
            message="Index building failed",
            detail=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ==================== 层级树接口 ====================


@router.get("/{doc_id}/tree", response_model=TreeResponse)
async def get_document_tree(doc_id: str) -> TreeResponse:
    """获取文档层级树 - 用于前端思维导图"""
    try:
        # 获取文档
        doc = await get_document(doc_id)
        if not doc:
            raise AppException(
                code="DOCUMENT_NOT_FOUND",
                message=f"Document not found: {doc_id}",
            )

        # 获取所有章节
        sections = await get_sections(doc_id)

        if not sections:
            # 无章节，返回默认树
            return TreeResponse(
                doc_id=doc_id,
                title=doc["title"],
                tree=TreeNodeResponse(
                    id="root",
                    title=doc["title"],
                    level=0,
                    page_range=f"1-{doc.get('page_count', 1)}",
                    paragraph_count=doc.get("paragraph_count", 0),
                ),
            )

        # 转换为嵌套树结构
        tree = _build_tree_from_sections(sections)

        return TreeResponse(
            doc_id=doc_id,
            title=doc["title"],
            tree=tree,
        )

    except AppException:
        raise
    except Exception as e:
        logger.exception("Failed to get tree")
        raise AppException(
            code="TREE_ERROR",
            message="Failed to get document tree",
            detail=str(e),
        )


def _build_tree_from_sections(sections: list[dict]) -> TreeNodeResponse:
    """将扁平章节列表转换为嵌套树"""
    if not sections:
        return TreeNodeResponse(
            id="root",
            title="Document",
            level=0,
            page_range="1",
        )

    # 创建节点映射
    node_map: dict[str, TreeNodeResponse] = {}
    for sec in sections:
        page_range = f"{sec['start_page']}-{sec['end_page']}" if sec["start_page"] != sec["end_page"] else str(sec["start_page"])
        node_map[sec["id"]] = TreeNodeResponse(
            id=sec["id"],
            title=sec["title"],
            level=sec["level"],
            page_range=page_range,
            summary=sec.get("summary"),
        )

    # 构建父子关系
    root = TreeNodeResponse(
        id="root",
        title="Document",
        level=0,
        page_range=f"1-{sections[-1]['end_page']}" if sections else "1",
    )

    # 迭代构建树
    for sec in sections:
        node = node_map[sec["id"]]
        parent_id = sec.get("parent_id")

        if parent_id and parent_id in node_map:
            node_map[parent_id].children.append(node)
        elif sec["level"] == 1:
            root.children.append(node)

    # 如果没有层级1，直接作为根的子节点
    if not root.children:
        for sec in sections:
            root.children.append(node_map[sec["id"]])

    # 统计段落数量
    root.paragraph_count = sum(1 for sec in sections)

    return root


# ==================== 段落热力图接口 ====================


@router.get("/{doc_id}/paragraphs", response_model=ParagraphsResponse)
async def get_document_paragraphs(
    doc_id: str,
    limit: int = 1000,
    offset: int = 0,
) -> ParagraphsResponse:
    """获取文档段落列表 - 用于前端热力图"""
    try:
        # 获取文档
        doc = await get_document(doc_id)
        if not doc:
            raise AppException(
                code="DOCUMENT_NOT_FOUND",
                message=f"Document not found: {doc_id}",
            )

        # 获取段落（从 chunks 表读取 paragraph 类型）
        paragraphs = await get_chunks(doc_id, chunk_type="paragraph", granularity="paragraph")

        if not paragraphs:
            return ParagraphsResponse(
                doc_id=doc_id,
                paragraphs=[],
                total=0,
                page_count=doc.get("page_count", 0),
            )

        # 转换为响应模型
        items = []
        for para in paragraphs[offset:offset + limit]:
            normalized_content = normalize_extracted_text(para["content"])
            items.append(
                ParagraphItem(
                    id=para["id"],
                    content=(
                        normalized_content[:200] + "..."
                        if len(normalized_content) > 200
                        else normalized_content
                    ),
                    page=para.get("page_numbers", [1])[0] if para.get("page_numbers") else 1,
                    position=para["position"],
                    section_id=para.get("section_id"),
                    char_count=para["char_count"],
                )
            )

        # 按 page 和 position 排序
        items.sort(key=lambda x: (x.page, x.position))

        return ParagraphsResponse(
            doc_id=doc_id,
            paragraphs=items,
            total=len(paragraphs),
            page_count=doc.get("page_count", 0),
        )

    except AppException:
        raise
    except Exception as e:
        logger.exception("Failed to get paragraphs")
        raise AppException(
            code="PARAGRAPHS_ERROR",
            message="Failed to get paragraphs",
            detail=str(e),
        )


# ==================== 辅助函数 ====================


def _tree_to_sections(tree: Optional[TreeNodeResponse], doc_id: str) -> list[dict]:
    """将树节点转换为 sections 数据列表"""
    if not tree:
        return []

    sections = []

    def parse_node(node: TreeNodeResponse, parent_id: Optional[str] = None):
        # 跳过根节点（level=0）
        if node.level == 0:
            # 根节点不保存，只处理子节点
            for child in node.children or []:
                parse_node(child, None)
            return

        # 解析页码范围
        page_range = node.page_range
        if "-" in page_range:
            start_page, end_page = map(int, page_range.split("-"))
        else:
            start_page = end_page = int(page_range)

        sections.append({
            "id": node.id,
            "doc_id": doc_id,
            "title": node.title,
            "level": node.level,
            "parent_id": parent_id,
            "start_page": start_page,
            "end_page": end_page,
            "summary": node.summary,
        })

        # 递归处理子节点
        for child in node.children or []:
            parse_node(child, node.id)

    parse_node(tree)
    return sections


def _count_sections(tree: Optional[TreeNodeResponse]) -> int:
    """统计章节数量"""
    if not tree:
        return 0

    count = len(tree.children)
    for child in tree.children:
        count += _count_sections(child)
    return count
