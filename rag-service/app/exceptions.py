"""自定义异常"""
from typing import Any, Optional

from fastapi import status


class AppException(Exception):
    """应用异常基类"""

    def __init__(
        self,
        code: str,
        message: str,
        detail: Optional[Any] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.code = code
        self.message = message
        self.detail = detail
        self.status_code = status_code
        super().__init__(message)


class DocumentException(AppException):
    """文档相关异常"""
    pass


class IndexException(AppException):
    """索引相关异常"""
    pass


class ParseException(AppException):
    """解析异常"""
    pass


class ValidationException(AppException):
    """验证异常"""
    pass