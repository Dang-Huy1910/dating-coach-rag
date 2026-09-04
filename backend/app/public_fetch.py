"""Official public metadata for YouTube + Reddit only. Never Instagram/TikTok/X."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import parse_qs, urlparse

import httpx

from backend.app.config import get_settings

FetchHost = Literal["youtube", "reddit", "unsupported", "none"]

_YT_VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_REDDIT_USER = re.compile(r"^/u(?:ser)?/([^/]+)/?", re.I)
_REDDIT_COMMENT = re.compile(
    r"^/r/([^/]+)/comments/([A-Za-z0-9]+)",
    re.I,
)
_UA = "dating-coach-rag/0.3 (local coaching demo; not a crawler)"


@dataclass(frozen=True)
class PublicFetchResult:
    host: FetchHost
    text: str | None
    error_code: str | None = None
    error_detail: str | None = None


def classify_profile_url(url: str | None) -> FetchHost:
    host = (urlparse(url or "").hostname or "").lower().removeprefix("www.")
    if not host:
        return "none"
    if host in {"youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"}:
        return "youtube"
    if host in {"reddit.com", "old.reddit.com", "m.reddit.com", "i.reddit.com"}:
        return "reddit"
    return "unsupported"


def merge_fetched_text(user_text: str, fetched: str) -> str:
    pasted = (user_text or "").strip()
    block = (fetched or "").strip()
    if not block:
        return pasted
    if not pasted:
        return block
    return f"{pasted}\n\n[public fetch]\n{block}"


def fetch_public_profile(url: str | None) -> PublicFetchResult:
    raw = (url or "").strip()
    if not raw:
        return PublicFetchResult(host="none", text=None)
    host = classify_profile_url(raw)
    if host == "unsupported":
        return PublicFetchResult(host="unsupported", text=None)
    if host == "youtube":
        return _fetch_youtube(raw)
    if host == "reddit":
        return _fetch_reddit(raw)
    return PublicFetchResult(host="none", text=None)


def _http_get_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, str] | None = None,
) -> Any:
    with httpx.Client(timeout=8.0, follow_redirects=True) as client:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()


def _truncate(text: str, limit: int = 4000) -> str:
    cleaned = re.sub(r"\n{3,}", "\n\n", (text or "").strip())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _parse_youtube(url: str) -> dict[str, str] | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().removeprefix("www.")
    path = parsed.path or ""
    if host == "youtu.be":
        vid = path.strip("/").split("/")[0]
        if _YT_VIDEO_ID.match(vid):
            return {"kind": "video", "id": vid}
        return None
    qs = parse_qs(parsed.query)
    if "v" in qs and _YT_VIDEO_ID.match(qs["v"][0]):
        return {"kind": "video", "id": qs["v"][0]}
    parts = [p for p in path.split("/") if p]
    if not parts:
        return None
    if parts[0] == "shorts" and len(parts) > 1 and _YT_VIDEO_ID.match(parts[1]):
        return {"kind": "video", "id": parts[1]}
    if parts[0] == "channel" and len(parts) > 1 and parts[1].startswith("UC"):
        return {"kind": "channel", "id": parts[1]}
    if parts[0].startswith("@"):
        return {"kind": "handle", "id": parts[0].lstrip("@")}
    if parts[0] in {"c", "user"} and len(parts) > 1:
        return {"kind": "handle", "id": parts[1]}
    return None


def _fetch_youtube(url: str) -> PublicFetchResult:
    settings = get_settings()
    key = (settings.youtube_api_key or "").strip()
    parsed = _parse_youtube(url)
    if not parsed:
        return PublicFetchResult(
            host="youtube",
            text=None,
            error_code="fetch_failed",
            error_detail="Không nhận ra link YouTube (cần URL video, @handle, hoặc /channel/…).",
        )
    if not key:
        return PublicFetchResult(
            host="youtube",
            text=None,
            error_code="fetch_failed",
            error_detail="Cần YOUTUBE_API_KEY để đọc kênh/video YouTube công khai.",
        )
    try:
        if parsed["kind"] == "video":
            data = _http_get_json(
                "https://www.googleapis.com/youtube/v3/videos",
                params={"part": "snippet", "id": parsed["id"], "key": key},
            )
            items = data.get("items") or []
            if not items:
                return PublicFetchResult(
                    host="youtube",
                    text=None,
                    error_code="fetch_failed",
                    error_detail="Không tìm thấy video YouTube công khai này.",
                )
            snip = items[0].get("snippet") or {}
            text = _truncate(
                "\n".join(
                    [
                        f"YouTube video: {snip.get('title') or ''}",
                        f"Kênh: {snip.get('channelTitle') or ''}",
                        snip.get("description") or "",
                    ]
                )
            )
            return PublicFetchResult(host="youtube", text=text)
        params = {"part": "snippet", "key": key}
        if parsed["kind"] == "channel":
            params["id"] = parsed["id"]
        else:
            params["forHandle"] = parsed["id"]
        data = _http_get_json(
            "https://www.googleapis.com/youtube/v3/channels",
            params=params,
        )
        items = data.get("items") or []
        if not items:
            return PublicFetchResult(
                host="youtube",
                text=None,
                error_code="fetch_failed",
                error_detail="Không tìm thấy kênh YouTube công khai này.",
            )
        snip = items[0].get("snippet") or {}
        text = _truncate(
            "\n".join(
                [
                    f"YouTube kênh: {snip.get('title') or ''}",
                    snip.get("description") or "",
                ]
            )
        )
        return PublicFetchResult(host="youtube", text=text)
    except httpx.HTTPError:
        return PublicFetchResult(
            host="youtube",
            text=None,
            error_code="fetch_failed",
            error_detail="Không đọc được YouTube lúc này. Thử lại hoặc dán mô tả kênh/video.",
        )


def _parse_reddit(url: str) -> dict[str, str] | None:
    parsed = urlparse(url)
    path = parsed.path or ""
    user = _REDDIT_USER.match(path)
    if user:
        return {"kind": "user", "id": user.group(1)}
    comment = _REDDIT_COMMENT.match(path)
    if comment:
        return {"kind": "post", "sub": comment.group(1), "id": comment.group(2)}
    return None


def _fetch_reddit(url: str) -> PublicFetchResult:
    parsed = _parse_reddit(url)
    if not parsed:
        return PublicFetchResult(
            host="reddit",
            text=None,
            error_code="fetch_failed",
            error_detail="Không nhận ra link Reddit (cần /user/… hoặc bài /r/…/comments/…).",
        )
    headers = {"User-Agent": _UA, "Accept": "application/json"}
    try:
        if parsed["kind"] == "user":
            data = _http_get_json(
                f"https://www.reddit.com/user/{parsed['id']}/about.json",
                headers=headers,
            )
            inner = (data or {}).get("data") or {}
            sub = inner.get("subreddit") or {}
            text = _truncate(
                "\n".join(
                    [
                        f"Reddit user: u/{inner.get('name') or parsed['id']}",
                        sub.get("title") or "",
                        sub.get("public_description") or "",
                    ]
                )
            )
            return PublicFetchResult(host="reddit", text=text or None)
        data = _http_get_json(
            f"https://www.reddit.com/r/{parsed['sub']}/comments/{parsed['id']}.json",
            headers=headers,
            params={"limit": "5", "raw_json": "1"},
        )
        post = {}
        comments: list[str] = []
        if isinstance(data, list) and data:
            children = ((data[0] or {}).get("data") or {}).get("children") or []
            if children:
                post = (children[0] or {}).get("data") or {}
            if len(data) > 1:
                for child in ((data[1] or {}).get("data") or {}).get("children") or []:
                    body = ((child or {}).get("data") or {}).get("body")
                    if isinstance(body, str) and body.strip() and body != "[removed]":
                        comments.append(body.strip())
                    if len(comments) >= 3:
                        break
        lines = [
            f"Reddit bài r/{parsed['sub']}: {post.get('title') or ''}",
            post.get("selftext") or "",
        ]
        if comments:
            lines.append("Bình luận nổi bật:")
            lines.extend(f"- {c}" for c in comments)
        text = _truncate("\n".join(lines))
        if not text:
            return PublicFetchResult(
                host="reddit",
                text=None,
                error_code="fetch_failed",
                error_detail="Không đọc được nội dung Reddit công khai này.",
            )
        return PublicFetchResult(host="reddit", text=text)
    except httpx.HTTPError:
        return PublicFetchResult(
            host="reddit",
            text=None,
            error_code="fetch_failed",
            error_detail="Không đọc được Reddit lúc này. Thử lại hoặc dán tiêu đề/caption bài.",
        )
