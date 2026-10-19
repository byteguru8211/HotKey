"""Настройки профиля и игровые предпочтения."""

from __future__ import annotations

from flask import Blueprint, request

from ..auth import current_user, login_required
from ..errors import ApiError, ok
from ..extensions import db
from ..models import User
from .auth import USERNAME_RE

bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@bp.patch("")
@login_required
def update_profile():
    user = current_user()
    payload = request.get_json(silent=True) or {}
    fields: dict[str, str] = {}

    if "username" in payload:
        username = str(payload.get("username", "")).strip()
        if not USERNAME_RE.match(username):
            fields["username"] = "2–24 символа: буквы, цифры, пробел, точка, дефис или _"
        else:
            key = username.lower()
            existing = User.query.filter(User.username_key == key, User.id != user.id).first()
            if existing:
                fields["username"] = "Это имя уже занято"
            else:
                user.username = username
                user.username_key = key

    if "sound_enabled" in payload:
        user.sound_enabled = bool(payload.get("sound_enabled"))
    if "effects_enabled" in payload:
        user.effects_enabled = bool(payload.get("effects_enabled"))
    if "preferred_language" in payload:
        language = payload.get("preferred_language")
        if language not in ("ru", "en"):
            fields["preferred_language"] = "Поддерживаются ru и en"
        else:
            user.preferred_language = language

    if fields:
        raise ApiError("Проверьте настройки", fields=fields)

    db.session.commit()
    return ok({"user": user.as_dict()})


@bp.get("/summary")
@login_required
def summary():
    user = current_user()
    return ok(
        {
            "user": user.as_dict(),
            "member_since": user.created_at.isoformat() + "Z" if user.created_at else None,
        }
    )
