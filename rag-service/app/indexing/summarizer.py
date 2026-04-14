"""摘要生成模块"""
from abc import ABC, abstractmethod
from typing import Optional

from app.core import logger


class BaseSummarizer(ABC):
    """摘要生成器抽象基类"""

    @abstractmethod
    async def summarize(self, content: str, **kwargs) -> str:
        """生成摘要"""
        pass

    @abstractmethod
    async def summarize_sections(self, sections: list[dict], **kwargs) -> list[dict]:
        """批量生成章节摘要"""
        pass


class ExtractiveSummarizer(BaseSummarizer):
    """抽取式摘要 - 简单提取关键句子"""

    def __init__(self, max_sentences: int = 3):
        self.max_sentences = max_sentences

    async def summarize(self, content: str, **kwargs) -> str:
        """抽取关键句子作为摘要"""
        import re

        # 句子分隔符
        sentence_end = re.compile(r"[。！？\.\!\?]")
        sentences = sentence_end.split(content)

        # 简单策略：取前N个句子
        key_sentences = []
        for sent in sentences:
            sent = sent.strip()
            if len(sent) > 10:  # 过滤过短的
                key_sentences.append(sent)
                if len(key_sentences) >= self.max_sentences:
                    break

        return "。".join(key_sentences) + "。" if key_sentences else ""

    async def summarize_sections(self, sections: list[dict], **kwargs) -> list[dict]:
        """为每个章节生成摘要"""
        result = []

        for section in sections:
            paragraphs = section.get("paragraphs", [])
            content = " ".join(paragraphs)

            summary = await self.summarize(content)

            result.append({
                **section,
                "summary": summary,
            })

        logger.info(f"Generated summaries for {len(result)} sections")

        return result


class LLMSummarizer(BaseSummarizer):
    """LLM 摘要生成器"""

    def __init__(self, llm_client=None):
        self.llm_client = llm_client
        self.prompt_template = "请用一句话概括以下内容：\n{content}"

    async def summarize(self, content: str, **kwargs) -> str:
        """使用 LLM 生成摘要"""
        if not self.llm_client:
            logger.warning("No LLM client, falling back to extractive")
            extractive = ExtractiveSummarizer()
            return await extractive.summarize(content, **kwargs)

        prompt = self.prompt_template.format(content=content[:2000])  # 限制输入长度

        try:
            response = await self.llm_client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"LLM summarization failed: {e}")
            # 回退到抽取式
            extractive = ExtractiveSummarizer()
            return await extractive.summarize(content, **kwargs)

    async def summarize_sections(self, sections: list[dict], **kwargs) -> list[dict]:
        """批量生成章节摘要"""
        result = []

        for section in sections:
            paragraphs = section.get("paragraphs", [])
            content = " ".join(paragraphs[:5])  # 取前5段

            summary = await self.summarize(content)

            result.append({
                **section,
                "summary": summary,
            })

        return result