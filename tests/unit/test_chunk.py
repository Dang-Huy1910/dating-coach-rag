from pathlib import Path

from backend.app.rag.chunk import chunk_markdown


def test_chunks_by_heading(tmp_path: Path):
    path = tmp_path / "01-profile-bio.md"
    path.write_text(
        "# Bio\n\n## Mục tiêu\n\n"
        + ("Viết cụ thể. " * 40)
        + "\n\n## Độ dài\n\n"
        + ("Ba đến năm dòng. " * 40),
        encoding="utf-8",
    )
    chunks = chunk_markdown(path, "01-profile-bio")
    assert chunks
    headings = {c.heading for c in chunks}
    assert "Mục tiêu" in headings
    assert "Độ dài" in headings
    assert all(len(c.text) <= 800 for c in chunks)
