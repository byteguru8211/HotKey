"""Таблица лидеров: рейтинги по скорости, точности и опыту."""

from __future__ import annotations

from datetime import timedelta

from flask import Blueprint, request
from sqlalchemy import and_, case, func

from ..auth import current_user
from ..errors import ApiError, ok
from ..extensions import db
from ..models import TypingSession, User
from ..timeutil import day_start_utc, local_today

bp = Blueprint("leaderboard", __name__, url_prefix="/api/leaderboard")

PERIODS = ("today", "week", "all")
METRICS = ("cpm", "accuracy", "xp")
LIMIT = 20


def _period_start(period: str):
    today = local_today()
    if period == "today":
        return day_start_utc(today)
    if period == "week":
        monday = today - timedelta(days=today.weekday())
        return day_start_utc(monday)
    return None


@bp.get("")
def leaderboard():
    period = request.args.get("period", "week")
    metric = request.args.get("metric", "cpm")
    if period not in PERIODS:
        raise ApiError("Неизвестный период", code="invalid_period")
    if metric not in METRICS:
        raise ApiError("Неизвестная метрика", code="invalid_metric")

    user = current_user()
    start = _period_start(period)

    eligible_accuracy = case(
        (
            and_(TypingSession.duration_sec >= 20, TypingSession.correct_chars >= 40),
            TypingSession.accuracy,
        ),
        else_=None,
    )

    query = (
        db.session.query(
            User.id,
            User.username,
            User.level,
            User.streak_days,
            func.max(TypingSession.cpm).label("best_cpm"),
            func.max(eligible_accuracy).label("best_accuracy"),
            func.sum(TypingSession.xp_earned).label("xp"),
            func.count(TypingSession.id).label("sessions"),
        )
        .join(TypingSession, TypingSession.user_id == User.id)
        .group_by(User.id, User.username, User.level, User.streak_days)
    )
    if start is not None:
        query = query.filter(TypingSession.created_at >= start)

    rows = query.all()

    entries = []
    for row in rows:
        best_cpm = float(row.best_cpm or 0)
        best_accuracy = float(row.best_accuracy or 0)
        xp = int(row.xp or 0)
        if metric == "cpm":
            value = best_cpm
        elif metric == "accuracy":
            value = best_accuracy
        else:
            value = xp
        if value <= 0:
            continue
        entries.append(
            {
                "user_id": row.id,
                "username": row.username,
                "level": row.level,
                "streak_days": row.streak_days or 0,
                "cpm": round(best_cpm, 1),
                "wpm": round(best_cpm / 5, 1),
                "accuracy": round(best_accuracy, 2),
                "xp": xp,
                "sessions": int(row.sessions or 0),
                "value": round(value, 1),
                "is_me": bool(user and user.id == row.id),
            }
        )

    entries.sort(key=lambda item: (-item["value"], -item["accuracy"], item["username"].lower()))
    for index, entry in enumerate(entries, start=1):
        entry["rank"] = index

    me = next((entry for entry in entries if entry["is_me"]), None)
    top = entries[:LIMIT]
    return ok(
        {
            "metric": metric,
            "period": period,
            "entries": top,
            "me": me,
            "participants": len(entries),
            "my_in_top": bool(me and me["rank"] <= LIMIT),
        }
    )
