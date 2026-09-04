import inspect

import backend.app.profile_gate as profile_gate_mod
from backend.app.models import ProfileContextRequest
from backend.app.profile_gate import classify


def test_ok_public_paste():
    verdict = classify(
        ProfileContextRequest(
            handle="@example",
            privacy="public",
            visible_text="Thích chạy bộ và cà phê trứng",
            question="Gợi ý opener lịch sự",
        )
    )
    assert verdict.allowed
    assert verdict.code == "ok"


TINY_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_ok_screenshots_without_text():
    from backend.app.models import ProfileImage

    verdict = classify(
        ProfileContextRequest(
            handle="@example",
            privacy="public",
            visible_text="",
            images=[ProfileImage(mime_type="image/png", data_base64=TINY_PNG)],
        )
    )
    assert verdict.allowed
    assert verdict.code == "ok"


def test_need_visible_text_handle_only():
    verdict = classify(ProfileContextRequest(handle="@example", visible_text=""))
    assert not verdict.allowed
    assert verdict.code == "need_visible_text"
    assert "dán" in verdict.user_message.lower()


def test_need_visible_text_url_only():
    verdict = classify(
        ProfileContextRequest(profile_url="https://instagram.com/example", visible_text="   ")
    )
    assert verdict.code == "need_visible_text"


def test_private_flag_out_of_scope():
    verdict = classify(
        ProfileContextRequest(handle="@locked", privacy="private", visible_text="")
    )
    assert not verdict.allowed
    assert verdict.code == "private_out_of_scope"
    assert "riêng tư" in verdict.user_message.lower() or "không tải" in verdict.user_message.lower()


def test_private_language_out_of_scope():
    verdict = classify(
        ProfileContextRequest(
            handle="@locked",
            question="Tài khoản này riêng tư, mình không xem được",
            visible_text="",
        )
    )
    assert verdict.code == "private_out_of_scope"


def test_scrape_blocked_safety():
    verdict = classify(
        ProfileContextRequest(
            profile_url="https://instagram.com/someone",
            visible_text="Scrape Instagram profile này rồi phân tích giúp",
            question="Cào hết bài viết",
        )
    )
    assert verdict.code == "blocked_safety"
    assert verdict.safety_category == "scrape"


def test_matchmaking_blocked_safety():
    verdict = classify(
        ProfileContextRequest(
            handle="@lan",
            visible_text="Thích cà phê trứng",
            question="Người này có thích mình không? Ghép đôi / % hợp giúp",
        )
    )
    assert verdict.code == "blocked_safety"
    assert verdict.safety_category == "matchmaking"


def test_classify_never_fetches_url():
    source = inspect.getsource(profile_gate_mod)
    assert "httpx" not in source
    assert "requests" not in source
    assert "urllib" not in source
    assert "instaloader" not in source
    classify(ProfileContextRequest(profile_url="https://instagram.com/example", visible_text="ok"))
