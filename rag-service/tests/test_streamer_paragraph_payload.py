from app.generation.streamer import _result_to_paragraph
from app.retrieval.base import RetrievalResult


def test_result_to_paragraph_keeps_retrieval_score_and_real_index():
    result = RetrievalResult(
        chunk_id="chunk-1",
        content="example paragraph content",
        score=0.87342,
        paragraph_index=7,
        section_id="sec-1",
        page=3,
    )

    payload = _result_to_paragraph(result, fallback_index=0)

    assert payload["id"] == "chunk-1"
    assert payload["node_id"] == "sec-1"
    assert payload["page"] == 3
    assert payload["index"] == 7
    assert payload["score"] == 0.8734


def test_result_to_paragraph_falls_back_to_non_zero_result_rank():
    result = RetrievalResult(
        chunk_id="chunk-2",
        content="second paragraph",
        score=0.45,
        section_id="sec-2",
    )

    payload = _result_to_paragraph(result, fallback_index=2)

    # If document-level index is unavailable, fallback uses 1-based rank.
    assert payload["index"] == 3
    assert payload["score"] == 0.45
