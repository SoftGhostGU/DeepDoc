"""检索器抽象基类"""
from abc import ABC, abstractmethod
from typing import Optional

from pydantic import BaseModel


class RetrievalResult(BaseModel):
    chunk_id: str
    content: str
    score: float
    page: Optional[int] = None
    paragraph_index: Optional[int] = None
    section_id: Optional[str] = None
    chunk_type: str = "paragraph"
    granularity: str = "detail"
    metadata: dict = {}
    source: str = "unknown"


class RetrieverBase(ABC):
    @abstractmethod
    async def search(
        self,
        query: str,
        doc_id: str,
        top_k: int = 5,
        chunk_type: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> list[RetrievalResult]:
        ...
