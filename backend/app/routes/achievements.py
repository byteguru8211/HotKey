"""Выдача достижений пользователя и общего каталога."""

from __future__ import annotations

from flask import Blueprint

from .. import achievements as achievements_service
from ..auth import current_user
from ..errors import ok

bp = Blueprint("achievements", __name__, url_prefix="/api/achievements")


@bp.get("")
def list_achievements():
    user = current_user()
    if user is None:
        return ok(
            {
                "items": [
                    {
                        **achievements_service.public_definition(item),
                        "unlocked": False,
                        "unlocked_at": None,
                        "progress": {"current": 0, "target": 1, "percent": 0, "label": ""},
                    }
                    for item in achievements_service.ACHIEVEMENTS
                ],
                "unlocked_count": 0,
                "total_count": len(achievements_service.ACHIEVEMENTS),
                "xp_from_achievements": 0,
                "guest": True,
            }
        )
    return ok(achievements_service.list_with_progress(user))
