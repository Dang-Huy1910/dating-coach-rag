from __future__ import annotations

import os

import httpx
import streamlit as st

API = os.environ.get("DATING_COACH_API", "http://127.0.0.1:8000").rstrip("/")

st.set_page_config(page_title="Dating Coach RAG", page_icon="💬", layout="centered")
st.title("Dating Coach RAG")

if "session_id" not in st.session_state:
    st.session_state.session_id = None
if "disclaimer" not in st.session_state:
    st.session_state.disclaimer = ""
if "messages" not in st.session_state:
    st.session_state.messages = []


def _client() -> httpx.Client:
    return httpx.Client(base_url=API, timeout=60.0)


def ensure_session() -> str:
    if st.session_state.session_id:
        return st.session_state.session_id
    with _client() as client:
        response = client.post("/v1/sessions")
        response.raise_for_status()
        payload = response.json()
    st.session_state.session_id = payload["id"]
    st.session_state.disclaimer = payload.get("disclaimer", "")
    return st.session_state.session_id


def post_intent(mode: str, text: str) -> dict:
    sid = ensure_session()
    paths = {
        "ask": f"/v1/sessions/{sid}/ask",
        "rewrite_bio": f"/v1/sessions/{sid}/rewrite-bio",
        "analyze_message": f"/v1/sessions/{sid}/analyze-message",
        "openers": f"/v1/sessions/{sid}/openers",
    }
    bodies = {
        "ask": {"question": text, "stream": False},
        "rewrite_bio": {"draft": text},
        "analyze_message": {"draft": text},
        "openers": {"context": text},
    }
    with _client() as client:
        response = client.post(paths[mode], json=bodies[mode])
        if response.status_code >= 400:
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            raise RuntimeError(str(detail))
        return response.json()


try:
    ensure_session()
except Exception as exc:
    st.error(f"Không kết nối được API `{API}`: {exc}")
    st.stop()

st.info(st.session_state.disclaimer or "Đang tải disclaimer…")

mode_label = st.radio(
    "Bạn cần gì?",
    [
        "Hỏi coach",
        "Sửa bio",
        "Phân tích tin nhắn",
        "Gợi ý opener",
    ],
    horizontal=True,
)
mode_map = {
    "Hỏi coach": "ask",
    "Sửa bio": "rewrite_bio",
    "Phân tích tin nhắn": "analyze_message",
    "Gợi ý opener": "openers",
}
intent = mode_map[mode_label]

placeholders = {
    "ask": "Ví dụ: Bio hẹn hò ngắn nên viết thế nào?",
    "rewrite_bio": "Dán bio/profile nháp…",
    "analyze_message": "Dán tin nhắn bạn sắp gửi…",
    "openers": "Ngữ cảnh: app, bạn chung, sở thích trùng…",
}

for item in st.session_state.messages:
    with st.chat_message(item["role"]):
        st.markdown(item["content"])
        if item.get("citations"):
            with st.expander("Nguồn"):
                for cite in item["citations"]:
                    heading = f" — {cite.get('heading')}" if cite.get("heading") else ""
                    st.caption(f"{cite.get('title')}{heading} ({cite.get('path')})")

prompt = st.chat_input(placeholders[intent])
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    try:
        payload = post_intent(intent, prompt)
    except Exception as exc:
        payload = {
            "reply": f"Không gọi được coach: {exc}",
            "citations": [],
            "improved_draft": None,
            "openers": None,
            "refused": True,
        }
    parts = [payload.get("reply") or ""]
    if payload.get("improved_draft"):
        parts.append("**Bản sửa gợi ý:**\n\n" + payload["improved_draft"])
    if payload.get("openers"):
        listed = "\n".join(f"- {o}" for o in payload["openers"])
        parts.append("**Opener:**\n" + listed)
    assistant = "\n\n".join(p for p in parts if p)
    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": assistant,
            "citations": payload.get("citations") or [],
        }
    )
    with st.chat_message("assistant"):
        st.markdown(assistant)
        if payload.get("citations"):
            with st.expander("Nguồn"):
                for cite in payload["citations"]:
                    heading = f" — {cite.get('heading')}" if cite.get("heading") else ""
                    st.caption(f"{cite.get('title')}{heading} ({cite.get('path')})")
