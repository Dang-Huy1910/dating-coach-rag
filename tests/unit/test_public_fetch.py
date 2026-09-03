from backend.app.public_fetch import (
    PublicFetchResult,
    classify_profile_url,
    fetch_public_profile,
    merge_fetched_text,
)


def test_classify_youtube_reddit_instagram():
    assert classify_profile_url("https://youtu.be/abcdefghijk") == "youtube"
    assert classify_profile_url("https://www.youtube.com/watch?v=abcdefghijk") == "youtube"
    assert classify_profile_url("https://www.reddit.com/user/demo") == "reddit"
    assert classify_profile_url("https://www.instagram.com/lo._.hoe23/") == "unsupported"
    assert classify_profile_url("") == "none"


def test_merge_fetched_text():
    assert merge_fetched_text("paste", "fetched") == "paste\n\n[public fetch]\nfetched"
    assert merge_fetched_text("", "fetched") == "fetched"


def test_youtube_fetch_uses_api(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key")
    from backend.app.config import get_settings

    get_settings.cache_clear()

    def fake_get(url, *, headers=None, params=None):
        assert "youtube/v3/videos" in url
        return {
            "items": [
                {
                    "snippet": {
                        "title": "Sunrise trail",
                        "channelTitle": "Runner",
                        "description": "Đà Lạt 5km",
                    }
                }
            ]
        }

    monkeypatch.setattr("backend.app.public_fetch._http_get_json", fake_get)
    result = fetch_public_profile("https://youtu.be/abcdefghijk")
    assert result.host == "youtube"
    assert result.text
    assert "Sunrise trail" in result.text
    get_settings.cache_clear()


def test_reddit_user_fetch(monkeypatch):
    def fake_get(url, *, headers=None, params=None):
        assert "/user/demo/about.json" in url
        return {
            "data": {
                "name": "demo",
                "subreddit": {"title": "u/demo", "public_description": "Thích chạy bộ"},
            }
        }

    monkeypatch.setattr("backend.app.public_fetch._http_get_json", fake_get)
    result = fetch_public_profile("https://www.reddit.com/user/demo")
    assert result.host == "reddit"
    assert result.text
    assert "chạy bộ" in result.text


def test_instagram_is_not_fetched(monkeypatch):
    def boom(*_args, **_kwargs):
        raise AssertionError("must not HTTP social hosts other than YT/Reddit")

    monkeypatch.setattr("backend.app.public_fetch._http_get_json", boom)
    result = fetch_public_profile("https://www.instagram.com/lo._.hoe23/")
    assert result == PublicFetchResult(host="unsupported", text=None)
