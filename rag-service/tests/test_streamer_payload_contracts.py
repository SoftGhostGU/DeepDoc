from app.generation.streamer import _result_to_chunk, _result_to_paragraph
from app.retrieval.base import RetrievalResult


def test_result_to_chunk_includes_document_aware_display_metadata():
    result = RetrievalResult(
        chunk_id="chunk-1",
        content="example paragraph content",
        score=0.87342,
        paragraph_index=7,
        section_id="sec-1",
        page=3,
        metadata={
            "document_id": "rag-doc-1",
            "document_name": "Doc One",
            "section_title": "Introduction",
        },
    )

    payload = _result_to_chunk(result)

    assert payload["id"] == "chunk-1"
    assert payload["documentId"] == "rag-doc-1"
    assert payload["documentName"] == "Doc One"
    assert payload["sectionId"] == "sec-1"
    assert payload["sectionKey"] == "rag-doc-1:sec-1"
    assert payload["sectionTitle"] == "Introduction"
    assert payload["path"] == ["Doc One", "Introduction"]


def test_result_to_paragraph_includes_document_context_and_section_key():
    result = RetrievalResult(
        chunk_id="chunk-2",
        content="second paragraph",
        score=0.45,
        section_id="sec-2",
        page=4,
        metadata={
            "document_id": "rag-doc-2",
            "document_name": "Doc Two",
            "section_title": "Results",
        },
    )

    payload = _result_to_paragraph(result, fallback_index=2)

    assert payload["id"] == "chunk-2"
    assert payload["node_id"] == "sec-2"
    assert payload["documentId"] == "rag-doc-2"
    assert payload["documentName"] == "Doc Two"
    assert payload["sectionKey"] == "rag-doc-2:sec-2"
    assert payload["sectionTitle"] == "Results"
    assert payload["index"] == 3
