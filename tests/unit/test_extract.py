from backend.app.rag.extract import extract_text, is_allowed_filename


def test_allowed_extensions():
    assert is_allowed_filename("note.md")
    assert is_allowed_filename("guide.PDF")
    assert is_allowed_filename("page.html")
    assert not is_allowed_filename("virus.exe")
    assert not is_allowed_filename("photo.png")


def test_extract_txt_and_md():
    assert "xin chao" in extract_text("a.txt", "xin chao coach".encode("utf-8")).lower()
    md = b"# Tieu de\n\nDoan van ban du dai de chunk vao RAG library."
    text = extract_text("a.md", md)
    assert "Tieu de" in text


def test_extract_html_strips_tags():
    raw = b"<html><body><h1>Hello</h1><p>World coaching note here.</p></body></html>"
    text = extract_text("x.html", raw)
    assert "Hello" in text
    assert "<p>" not in text


def test_reject_empty():
    try:
        extract_text("empty.txt", b"   ")
        assert False, "expected error"
    except ValueError:
        pass
