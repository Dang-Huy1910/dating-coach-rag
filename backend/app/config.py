from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    llm_provider: str = "groq"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"
    retrieve_min_score: float = 0.35
    retrieve_top_k: int = 4
    knowledge_dir: Path = REPO_ROOT / "data" / "knowledge"
    index_dir: Path = REPO_ROOT / "data" / "index"
    dating_coach_embedder: str = Field(default="minilm")
    dating_coach_api: str = "http://127.0.0.1:8000"

    @property
    def embedder_name(self) -> str:
        return (self.dating_coach_embedder or "minilm").lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()


DISCLAIMER_TEXT = (
    "Đây là chatbot coach giao tiếp hẹn hò, không phải liệu pháp tâm lý, "
    "không thay thế bác sĩ hay nhà trị liệu, và không ghép đôi người thật."
)
