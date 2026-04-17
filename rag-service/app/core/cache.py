"""Model cache environment bootstrap."""

from __future__ import annotations

import os
from pathlib import Path

from loguru import logger

from app.core.config import get_settings


def configure_model_cache_env() -> None:
    settings = get_settings()
    cache_root = Path(settings.model_cache_dir).expanduser()
    hf_home = cache_root / "hf"
    hf_hub = hf_home / "hub"
    transformers_cache = cache_root / "transformers"
    sentence_home = cache_root / "sentence_transformers"

    for directory in (cache_root, hf_home, hf_hub, transformers_cache, sentence_home):
        directory.mkdir(parents=True, exist_ok=True)

    os.environ["HF_HOME"] = str(hf_home)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(hf_hub)
    os.environ["TRANSFORMERS_CACHE"] = str(transformers_cache)
    os.environ["SENTENCE_TRANSFORMERS_HOME"] = str(sentence_home)
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

    logger.info(f"Model cache directory configured: {cache_root}")
