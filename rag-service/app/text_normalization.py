"""Helpers for normalizing extracted document text."""

import re
import unicodedata

PRIVATE_USE_DIGIT_BASE = 0xF356
PRIVATE_USE_DIGIT_MAP = {
    chr(PRIVATE_USE_DIGIT_BASE + index): f" {index} "
    for index in range(10)
}

CHAR_REPLACEMENTS = {
    "●": "•",
    "▪": "•",
    "◦": "•",
    "‣": "•",
    "∙": "•",
    "◉": "•",
    "◌": "•",
    "\u00a0": " ",
    "\u2002": " ",
    "\u2003": " ",
    "\u2009": " ",
    "\u202f": " ",
    "\u3000": " ",
}

WHITESPACE_RE = re.compile(r"\s+")
BULLET_SPACING_RE = re.compile(r"\s*•\s*")
LATIN_TO_CJK_BOUNDARY_RE = re.compile(r"(?<=[A-Za-z0-9)])(?=[\u3400-\u9fff])")
CJK_TO_LATIN_BOUNDARY_RE = re.compile(r"(?<=[\u3400-\u9fff])(?=[A-Za-z0-9(])")


def normalize_extracted_text(text: str) -> str:
    """Normalize extracted PDF text into a safer UI/display form."""
    if not text:
        return ""

    normalized = unicodedata.normalize("NFKC", text)
    pieces: list[str] = []

    for char in normalized:
        if char in PRIVATE_USE_DIGIT_MAP:
            pieces.append(PRIVATE_USE_DIGIT_MAP[char])
            continue

        replaced = CHAR_REPLACEMENTS.get(char, char)
        if unicodedata.category(replaced).startswith("C") and replaced not in {"\n", "\t"}:
            continue
        pieces.append(replaced)

    cleaned = "".join(pieces)
    cleaned = BULLET_SPACING_RE.sub(" • ", cleaned)
    cleaned = LATIN_TO_CJK_BOUNDARY_RE.sub(" ", cleaned)
    cleaned = CJK_TO_LATIN_BOUNDARY_RE.sub(" ", cleaned)
    cleaned = WHITESPACE_RE.sub(" ", cleaned)
    return cleaned.strip()
