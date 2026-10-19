"""Аутентификация: подпись JWT, загрузка пользователя и защита маршрутов."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from .errors import ApiError
from .models import User, utcnow


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=current_app.config["JWT_LIFETIME_DAYS"])).timestamp()),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm=current_app.config["JWT_ALGORITHM"])


def _user_from_token(token: str) -> User | None:
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=[current_app.config["JWT_ALGORITHM"]],
        )
        user_id = int(payload.get("sub", 0))
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, TypeError):
        return None
    return User.query.get(user_id)


def load_current_user() -> User | None:
    header = request.headers.get("Authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else None
    if not token:
        return None
    user = _user_from_token(token)
    if user:
        user.last_seen_at = utcnow()
    return user


def current_user() -> User | None:
    if not hasattr(g, "_current_user"):
        g._current_user = load_current_user()
    return g._current_user


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            raise ApiError("Требуется вход в аккаунт", status=401, code="unauthorized")
        return func(*args, **kwargs)

    return wrapper


def auth_payload(user: User) -> dict:
    return {"token": create_token(user), "user": user.as_dict()}
