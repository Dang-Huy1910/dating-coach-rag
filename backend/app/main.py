from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import re
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.api.router import router
from backend.app.session_store import SessionStore


class NormalizePathMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if "//" in request.scope.get("path", ""):
            request.scope["path"] = re.sub(r"/+", "/", request.scope["path"])
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = SessionStore()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Dating Coach RAG API", version="0.1.0", lifespan=lifespan)
    app.state.store = SessionStore()
    app.add_middleware(NormalizePathMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {"status": "ok", "message": "Dating Coach RAG API is running"}

    app.include_router(router)
    return app


app = create_app()
