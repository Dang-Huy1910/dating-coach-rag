from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from backend.app.config import get_settings
from backend.app.rag.extract import ALLOWED_EXTENSIONS, FORMAT_LABELS, extract_text, is_allowed_filename
from backend.app.rag.ingest import ingest

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_SAFE = re.compile(r"[^a-zA-Z0-9._-]+")


@dataclass
class KnowledgeSource:
    source_id: str
    title: str
    path: str
    kind: str  # curated | upload
    bytes: int | None = None
    updated_at: str | None = None


def _uploads_dir() -> Path:
    settings = get_settings()
    path = settings.uploads_dir
    path.mkdir(parents=True, exist_ok=True)
    return path


def _meta_path() -> Path:
    return _uploads_dir() / "manifest.json"


def _load_manifest() -> dict:
    path = _meta_path()
    if not path.exists():
        return {"files": {}}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"files": {}}


def _save_manifest(data: dict) -> None:
    _meta_path().write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _safe_stem(name: str) -> str:
    stem = Path(name).stem.strip().lower() or "note"
    stem = _SAFE.sub("-", stem).strip("-._") or "note"
    return stem[:60]


def supported_formats() -> list[dict]:
    return FORMAT_LABELS


def list_sources() -> list[KnowledgeSource]:
    settings = get_settings()
    out: list[KnowledgeSource] = []
    knowledge = settings.knowledge_dir
    if knowledge.is_dir():
        for path in sorted(knowledge.glob("*.md")):
            out.append(
                KnowledgeSource(
                    source_id=path.stem,
                    title=_title_from_markdown(path),
                    path=f"data/knowledge/{path.name}",
                    kind="curated",
                    bytes=path.stat().st_size,
                    updated_at=datetime.fromtimestamp(
                        path.stat().st_mtime, tz=timezone.utc
                    ).isoformat(),
                )
            )
    manifest = _load_manifest()
    uploads = _uploads_dir()
    for path in sorted(uploads.iterdir()):
        if not path.is_file() or path.name.startswith(".") or path.name == "manifest.json":
            continue
        if path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        meta = (manifest.get("files") or {}).get(path.name, {})
        out.append(
            KnowledgeSource(
                source_id=path.stem,
                title=str(meta.get("title") or path.stem),
                path=f"data/uploads/{path.name}",
                kind="upload",
                bytes=path.stat().st_size,
                updated_at=str(
                    meta.get("uploaded_at")
                    or datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
                ),
            )
        )
    return out


def _title_from_markdown(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8").splitlines()[:20]:
            if line.startswith("# "):
                return line[2:].strip() or path.stem
    except OSError:
        pass
    return path.stem


def save_upload(*, filename: str, data: bytes) -> KnowledgeSource:
    if not filename or not is_allowed_filename(filename):
        raise ValueError(
            "Định dạng không hỗ trợ. Dùng: "
            + ", ".join(sorted(ALLOWED_EXTENSIONS))
        )
    if not data:
        raise ValueError("File trống.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("File quá lớn (tối đa 5MB).")

    # Validate extractability before writing.
    text = extract_text(filename, data)
    if len(text.strip()) < 20:
        raise ValueError("Nội dung chữ quá ngắn để đưa vào RAG.")

    suffix = Path(filename).suffix.lower()
    digest = hashlib.sha256(data).hexdigest()[:8]
    stem = _safe_stem(filename)
    source_id = f"upload-{stem}-{digest}"
    dest_name = f"{source_id}{suffix}"
    dest = _uploads_dir() / dest_name
    dest.write_bytes(data)

    title = stem.replace("-", " ").strip() or source_id
    # Prefer first markdown heading if md
    if suffix in {".md", ".markdown"}:
        for line in text.splitlines()[:30]:
            if line.startswith("# "):
                title = line[2:].strip() or title
                break

    manifest = _load_manifest()
    files = manifest.setdefault("files", {})
    files[dest_name] = {
        "source_id": source_id,
        "title": title,
        "original_name": filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "bytes": len(data),
    }
    _save_manifest(manifest)

    # Rebuild index so the new doc is immediately retrievable.
    ingest()
    return KnowledgeSource(
        source_id=source_id,
        title=title,
        path=f"data/uploads/{dest_name}",
        kind="upload",
        bytes=len(data),
        updated_at=files[dest_name]["uploaded_at"],
    )


def delete_upload(source_id: str) -> None:
    if not source_id.startswith("upload-"):
        raise ValueError("Chỉ xóa được tài liệu do người dùng tải lên.")
    uploads = _uploads_dir()
    matches = [
        p
        for p in uploads.iterdir()
        if p.is_file() and p.stem == source_id and p.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    if not matches:
        raise FileNotFoundError("Không tìm thấy tài liệu upload này.")
    manifest = _load_manifest()
    files = manifest.setdefault("files", {})
    for path in matches:
        files.pop(path.name, None)
        path.unlink(missing_ok=True)
    _save_manifest(manifest)
    ingest()


def reindex() -> int:
    return ingest()
