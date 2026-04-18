"""解析策略基类 - 统一接口"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from app.models import DocumentStructure


@dataclass
class ParseResult:
    """解析结果"""
    structure: DocumentStructure
    success: bool
    error_message: Optional[str] = None


class ParsingStrategy(ABC):
    """解析策略抽象基类"""

    @property
    @abstractmethod
    def supported_formats(self) -> list[str]:
        """支持的文档格式"""
        pass

    @abstractmethod
    async def parse(self, file_path: Path) -> ParseResult:
        """解析文件为文档结构

        Args:
            file_path: 文件路径

        Returns:
            ParseResult: 包含 DocumentStructure 的解析结果
        """
        pass

    def validate_file(self, file_path: Path, max_size: int = 200 * 1024 * 1024) -> None:
        """验证文件

        Args:
            file_path: 文件路径
            max_size: 最大文件大小 (字节)

        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 文件过大或格式不支持
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        size = file_path.stat().st_size
        if size > max_size:
            raise ValueError(f"File too large: {size} bytes (max: {max_size} bytes)")

        ext = file_path.suffix.lower()
        if ext not in self.supported_formats:
            raise ValueError(f"Unsupported format: {ext}")
