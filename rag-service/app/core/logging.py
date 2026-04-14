"""日志模块 - 使用 loguru 实现"""
import sys
from pathlib import Path
from typing import Any

from loguru import logger

from app.core.config import get_settings


def init_logging() -> None:
    """初始化日志配置"""
    settings = get_settings()

    # 移除默认处理器
    logger.remove()

    # 添加控制台输出
    logger.add(
        sys.stdout,
        format=settings.log_format,
        level=settings.log_level,
        colorize=True,
        backtrace=True,
        diagnose=True,
        enqueue=False,
    )

    # 配置日志文件（可选）
    log_dir = Path("./logs")
    if log_dir.exists() or log_dir.mkdir(parents=True, exist_ok=True):
        logger.add(
            log_dir / "app_{time}.log",
            format=settings.log_format,
            level="DEBUG",
            rotation=settings.log_rotation,
            retention=settings.log_retention,
            compression="zip",
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

    # 设置全局日志级别
    logger.level(settings.log_level)


def log_with_context(message: str, **kwargs: Any) -> None:
    """带上下文的日志输出"""
    extra_info = " | ".join(f"{k}={v}" for k, v in kwargs.items())
    full_message = f"{message} | {extra_info}" if extra_info else message
    logger.debug(full_message)


# 预定义的日志方法
trace = logger.trace
debug = logger.debug
info = logger.info
success = logger.success
warning = logger.warning
error = logger.error
critical = logger.critical
exception = logger.exception
log_with_context = log_with_context