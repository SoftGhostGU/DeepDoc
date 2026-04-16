"""RRF fusion tests"""
from app.retrieval.base import RetrievalResult
from app.retrieval.fusion import rrf_fuse


def test_rrf_fuse_single_list():
    results = [
        RetrievalResult(chunk_id="a", content="hello", score=0.9, source="dense"),
        RetrievalResult(chunk_id="b", content="world", score=0.7, source="dense"),
    ]
    fused = rrf_fuse([results])
    assert len(fused) == 2
    assert fused[0].chunk_id == "a"


def test_rrf_fuse_multiple_lists():
    list1 = [
        RetrievalResult(chunk_id="a", content="hello", score=0.9, source="dense"),
        RetrievalResult(chunk_id="b", content="world", score=0.7, source="dense"),
    ]
    list2 = [
        RetrievalResult(chunk_id="b", content="world", score=0.8, source="sparse"),
        RetrievalResult(chunk_id="c", content="foo", score=0.5, source="sparse"),
    ]
    fused = rrf_fuse([list1, list2])
    assert len(fused) == 3
    assert fused[0].chunk_id == "b"
    assert fused[0].source == "fused"


def test_rrf_fuse_empty():
    assert rrf_fuse([]) == []
    assert rrf_fuse([[]]) == []
