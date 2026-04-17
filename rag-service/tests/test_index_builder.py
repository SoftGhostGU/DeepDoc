from app.indexing.builder import IndexBuilder


def test_build_sections_assigns_paragraphs_by_page_when_section_id_missing():
    builder = IndexBuilder()

    sections_data = [
        {
            "id": "sec_1",
            "title": "Part 1",
            "level": 1,
            "parent_id": None,
            "start_page": 1,
            "end_page": 2,
            "summary": None,
        },
        {
            "id": "sec_2",
            "title": "Part 2",
            "level": 1,
            "parent_id": None,
            "start_page": 3,
            "end_page": 4,
            "summary": None,
        },
    ]
    paragraphs_data = [
        {
            "id": "p1",
            "content": "first paragraph",
            "page_numbers": [1],
            "position": 0,
            "section_id": None,
            "char_count": 15,
        },
        {
            "id": "p2",
            "content": "second paragraph",
            "page_numbers": [3],
            "position": 1,
            "section_id": None,
            "char_count": 16,
        },
    ]

    sections = builder._build_sections(sections_data, paragraphs_data)

    assert [paragraph.id for paragraph in sections[0].paragraphs] == ["p1"]
    assert [paragraph.id for paragraph in sections[1].paragraphs] == ["p2"]
