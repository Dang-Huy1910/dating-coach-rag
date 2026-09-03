from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4

MAX_TURNS = 50


@dataclass
class Turn:
    id: str
    role_user_text: str
    intent: str
    reply_text: str
    refused: bool
    hedged: bool


@dataclass
class CoachingSession:
    id: str
    created_at: datetime
    updated_at: datetime
    messages: list[Turn] = field(default_factory=list)

    @property
    def turn_count(self) -> int:
        return len(self.messages)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, CoachingSession] = {}
        self._lock = Lock()

    def create(self) -> CoachingSession:
        now = datetime.now(UTC)
        session = CoachingSession(id=str(uuid4()), created_at=now, updated_at=now)
        with self._lock:
            self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> CoachingSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def delete(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def add_turn(self, session_id: str, turn: Turn) -> CoachingSession | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            session.messages.append(turn)
            if len(session.messages) > MAX_TURNS:
                session.messages = session.messages[-MAX_TURNS:]
            session.updated_at = datetime.now(UTC)
            return session

    def recent_turns(self, session_id: str, limit: int = 8) -> list[Turn]:
        session = self.get(session_id)
        if session is None:
            return []
        return session.messages[-limit:]
