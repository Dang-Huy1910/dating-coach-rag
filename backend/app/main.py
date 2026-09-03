from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.router import router
from backend.app.session_store import SessionStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = SessionStore()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Dating Coach RAG API", version="0.1.0", lifespan=lifespan)
    app.state.store = SessionStore()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:8501", "http://localhost:8501"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
