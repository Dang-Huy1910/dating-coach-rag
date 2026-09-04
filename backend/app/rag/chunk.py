from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from backend.app.config import REPO_ROOT

TARGET_MIN = 400
TARGET_MAX = 800
OVERLAP = 80

_HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


@dataclass
class Chunk:
    chunk_id: str
    source_id: str
    title: str
    heading: str | None
    text: str
    path: str


def _split_long(text: str) -> list[str]:
    text = text.strip()
    if len(text) <= TARGET_MAX:
        return [text] if text else []
    parts: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + TARGET_MAX, len(text))
        if end < len(text):
            cut = text.rfind("\n", start + TARGET_MIN, end)
            if cut == -1:
                cut = text.rfind(" ", start + TARGET_MIN, end)
            if cut != -1:
                end = cut
        piece = text[start:end].strip()
        if piece:
            parts.append(piece)
        if end >= len(text):
            break
        start = max(end - OVERLAP, start + 1)
    return parts


def chunk_markdown(path: Path, source_id: str) -> list[Chunk]:
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    title = source_id
    sections: list[tuple[str | None, list[str]]] = [(None, [])]
    for line in lines:
        heading = _HEADING.match(line)
        if heading:
            level = len(heading.group(1))
            name = heading.group(2).strip()
            if level == 1 and title == source_id:
                title = name
            sections.append((name, []))
            continue
        sections[-1][1].append(line)

    chunks: list[Chunk] = []
    n = 0
    for heading, body_lines in sections:
        body = "\n".join(body_lines).strip()
        if not body:
            continue
        for piece in _split_long(body):
            if len(piece) < 40:
                continue
            n += 1
            try:
                rel = path.resolve().relative_to(REPO_ROOT)
            except ValueError:
                rel = Path("data/knowledge") / path.name
            chunks.append(
                Chunk(
                    chunk_id=f"{source_id}#{n}",
                    source_id=source_id,
                    title=title,
                    heading=heading,
                    text=piece,
                    path=str(rel).replace("\\", "/"),
                )
            )
    return chunks


def chunk_plain(
    text: str,
    *,
    source_id: str,
    title: str,
    rel_path: str,
) -> list[Chunk]:
    """Chunk non-markdown extracted text (PDF/DOCX/HTML/TXT/CSV)."""
    body = (text or "").strip()
    if not body:
        return []
    # Prefer blank-line paragraphs, then length split.
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    if not paragraphs:
        paragraphs = [body]
    chunks: list[Chunk] = []
    n = 0
    for para in paragraphs:
        for piece in _split_long(para):
            if len(piece) < 40:
                continue
            n += 1
            chunks.append(
                Chunk(
                    chunk_id=f"{source_id}#{n}",
                    source_id=source_id,
                    title=title,
                    heading=None,
                    text=piece,
                    path=rel_path.replace("\\", "/"),
                )
            )
    if not chunks:
        # Short notes still useful — keep one chunk if at least ~20 chars.
        cleaned = body[:TARGET_MAX].strip()
        if len(cleaned) >= 20:
            chunks.append(
                Chunk(
                    chunk_id=f"{source_id}#1",
                    source_id=source_id,
                    title=title,
                    heading=None,
                    text=cleaned,
                    path=rel_path.replace("\\", "/"),
                )
            )
    return chunks
