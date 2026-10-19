"""Статистика: сводка, динамика по дням, проблемные символы и история."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from flask import Blueprint, request
from sqlalchemy import func

from .. import achievements as achievements_service
from ..auth import current_user, login_required
from ..errors import ok
from ..extensions import db
from ..models import TypingSession, UserCharStat
from ..scoring import MODES, level_progress, rank_for_level
from ..timeutil import day_key, day_start_utc, local_today

bp = Blueprint("stats", __name__, url_prefix="/api/stats")

DAILY_GOAL_CHARS = 3000
WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


def _day_start(day: date) -> datetime:
    return day_start_utc(day)


def _sessions_since(user_id: int, start: datetime) -> list[TypingSession]:
    return (
        TypingSession.query.filter(
            TypingSession.user_id == user_id, TypingSession.created_at >= start
        )
        .order_by(TypingSession.created_at.asc())
        .all()
    )


@bp.get("/overview")
@login_required
def overview():
    user = current_user()
    today = local_today()
    today_sessions = _sessions_since(user.id, _day_start(today))
    week_sessions = _sessions_since(user.id, _day_start(today - timedelta(days=6)))

    today_chars = sum(item.correct_chars for item in today_sessions)
    week_chars = sum(item.correct_chars for item in week_sessions)
    total_seconds = user.total_seconds or 0
    total_chars = user.total_chars or 0
    total_errors = user.total_errors or 0
    activity_days = len(
        {
            day_key(created_at)
            for (created_at,) in db.session.query(TypingSession.created_at)
            .filter(TypingSession.user_id == user.id)
            .all()
        }
    )

    mode_rows = (
        db.session.query(
            TypingSession.mode,
            func.count(TypingSession.id),
            func.avg(TypingSession.cpm),
            func.avg(TypingSession.accuracy),
            func.sum(TypingSession.correct_chars),
        )
        .filter(TypingSession.user_id == user.id)
        .group_by(TypingSession.mode)
        .all()
    )
    modes = [
        {
            "mode": row[0],
            "title": MODES.get(row[0], {}).get("title", row[0]),
            "sessions": int(row[1] or 0),
            "avg_cpm": round(float(row[2] or 0), 1),
            "avg_accuracy": round(float(row[3] or 0), 2),
            "chars": int(row[4] or 0),
        }
        for row in mode_rows
    ]
    modes.sort(key=lambda item: item["sessions"], reverse=True)

    achievement_data = achievements_service.list_with_progress(user)
    progress = level_progress(user.xp)

    average_accuracy = (
        total_chars / (total_chars + total_errors) * 100 if (total_chars + total_errors) else 0
    )
    average_cpm = total_chars / total_seconds * 60 if total_seconds else 0

    return ok(
        {
            "totals": {
                "sessions": user.total_sessions or 0,
                "seconds": total_seconds,
                "chars": total_chars,
                "errors": total_errors,
                "xp": user.xp,
                "streak_days": user.streak_days or 0,
                "longest_streak": user.longest_streak or 0,
                "activity_days": int(activity_days),
            },
            "averages": {
                "cpm": round(average_cpm, 1),
                "wpm": round(average_cpm / 5, 1),
                "accuracy": round(average_accuracy, 2),
            },
            "bests": {
                "cpm": round(user.best_cpm or 0, 1),
                "wpm": round(user.best_wpm or 0, 1),
                "accuracy": round(user.best_accuracy or 0, 2),
                "combo": user.best_combo or 0,
            },
            "level": {**progress, "rank": rank_for_level(progress["level"])},
            "today": {
                "chars": today_chars,
                "sessions": len(today_sessions),
                "seconds": sum(item.duration_sec for item in today_sessions),
                "xp": sum(item.xp_earned for item in today_sessions),
                "goal": DAILY_GOAL_CHARS,
                "percent": round(min(100, today_chars / DAILY_GOAL_CHARS * 100), 1),
                "goal_reached": today_chars >= DAILY_GOAL_CHARS,
            },
            "week": {
                "sessions": len(week_sessions),
                "chars": week_chars,
                "seconds": sum(item.duration_sec for item in week_sessions),
                "xp": sum(item.xp_earned for item in week_sessions),
                "accuracy": round(
                    sum(item.correct_chars for item in week_sessions)
                    / max(1, sum(item.correct_chars + item.errors for item in week_sessions))
                    * 100,
                    2,
                ),
            },
            "modes": modes,
            "achievements": {
                "unlocked": achievement_data["unlocked_count"],
                "total": achievement_data["total_count"],
            },
        }
    )


@bp.get("/daily")
@login_required
def daily():
    user = current_user()
    try:
        days = int(request.args.get("days", 14))
    except ValueError:
        days = 14
    days = max(7, min(days, 90))
    today = local_today()
    start_day = today - timedelta(days=days - 1)
    sessions = _sessions_since(user.id, _day_start(start_day))

    buckets = {
        (start_day + timedelta(days=offset)).isoformat(): {
            "date": (start_day + timedelta(days=offset)).isoformat(),
            "chars": 0,
            "sessions": 0,
            "correct": 0,
            "errors": 0,
            "duration": 0,
            "xp": 0,
            "cpm": 0.0,
            "accuracy": 0.0,
        }
        for offset in range(days)
    }
    for item in sessions:
        key = day_key(item.created_at).isoformat()
        bucket = buckets.get(key)
        if bucket is None:
            continue
        bucket["chars"] += item.correct_chars
        bucket["sessions"] += 1
        bucket["correct"] += item.correct_chars
        bucket["errors"] += item.errors
        bucket["duration"] += item.duration_sec
        bucket["xp"] += item.xp_earned

    for bucket in buckets.values():
        typed = bucket["correct"] + bucket["errors"]
        bucket["accuracy"] = round(bucket["correct"] / typed * 100, 1) if typed else 0.0
        bucket["cpm"] = round(bucket["correct"] / bucket["duration"] * 60, 1) if bucket["duration"] else 0.0
        day = date.fromisoformat(bucket["date"])
        bucket["label"] = f"{day.day} {MONTHS[day.month - 1]}"
        bucket["weekday"] = WEEKDAYS[day.weekday()]

    items = list(buckets.values())
    active = [item for item in items if item["sessions"] > 0]
    return ok(
        {
            "days": items,
            "summary": {
                "active_days": len(active),
                "best_cpm": max((item["cpm"] for item in active), default=0),
                "avg_accuracy": round(
                    sum(item["accuracy"] for item in active) / len(active), 1
                )
                if active
                else 0,
                "chars": sum(item["chars"] for item in items),
            },
        }
    )


@bp.get("/characters")
@login_required
def characters():
    user = current_user()
    try:
        limit = max(4, min(int(request.args.get("limit", 12)), 30))
    except ValueError:
        limit = 12
    try:
        min_attempts = max(1, min(int(request.args.get("min_attempts", 4)), 100))
    except ValueError:
        min_attempts = 4

    rows = (
        UserCharStat.query.filter(
            UserCharStat.user_id == user.id, UserCharStat.attempts >= min_attempts
        )
        .order_by(UserCharStat.attempts.desc())
        .limit(220)
        .all()
    )
    items = []
    for row in rows:
        accuracy = (row.attempts - row.errors) / row.attempts * 100 if row.attempts else 0
        items.append(
            {
                "symbol": row.symbol,
                "label": _symbol_label(row.symbol),
                "attempts": row.attempts,
                "errors": row.errors,
                "accuracy": round(accuracy, 1),
            }
        )
    items.sort(key=lambda item: (item["accuracy"], -item["attempts"]))
    problems = [item for item in items if item["errors"] > 0]
    hardest = problems[:limit] if problems else items[: min(limit, 3)]
    easiest = sorted(items, key=lambda item: (-item["accuracy"], -item["attempts"]))[: min(5, len(items))]
    total_attempts = sum(item["attempts"] for item in items)
    total_errors = sum(item["errors"] for item in items)
    return ok(
        {
            "hardest": hardest,
            "strongest": easiest,
            "summary": {
                "tracked_symbols": len(items),
                "attempts": total_attempts,
                "errors": total_errors,
                "accuracy": round((total_attempts - total_errors) / total_attempts * 100, 1)
                if total_attempts
                else 0,
                "min_attempts": min_attempts,
            },
        }
    )


def _symbol_label(symbol: str) -> str:
    mapping = {
        " ": "пробел",
        "␠": "пробел",
        "пробел": "пробел",
        "\n": "Enter",
        "⏎": "Enter",
        "\t": "Tab",
        "␣": "пробел",
    }
    if symbol in mapping:
        return mapping[symbol]
    if len(symbol) == 1 and symbol.isalpha():
        return f"буква {symbol}"
    if len(symbol) == 1 and symbol.isdigit():
        return f"цифра {symbol}"
    return f"символ {symbol}"


@bp.get("/sessions")
@login_required
def sessions():
    user = current_user()
    try:
        limit = max(1, min(int(request.args.get("limit", 10)), 50))
    except ValueError:
        limit = 10
    rows = (
        TypingSession.query.filter_by(user_id=user.id)
        .order_by(TypingSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return ok({"items": [row.as_dict() for row in rows]})


@bp.get("/activity")
@login_required
def activity():
    """Календарь активности за последние 12 недель."""
    user = current_user()
    today = local_today()
    start = today - timedelta(days=83)
    sessions = _sessions_since(user.id, _day_start(start))
    per_day: dict[str, int] = {}
    for item in sessions:
        key = day_key(item.created_at).isoformat()
        per_day[key] = per_day.get(key, 0) + item.correct_chars

    weeks = []
    cursor = start - timedelta(days=start.weekday())
    while cursor <= today:
        week = []
        for offset in range(7):
            day = cursor + timedelta(days=offset)
            if day > today:
                week.append(None)
                continue
            chars = per_day.get(day.isoformat(), 0)
            week.append(
                {
                    "date": day.isoformat(),
                    "chars": chars,
                    "level": 0
                    if chars == 0
                    else 1
                    if chars < 300
                    else 2
                    if chars < 800
                    else 3
                    if chars < 1500
                    else 4,
                }
            )
        weeks.append(week)
        cursor += timedelta(days=7)
    return ok({"weeks": weeks[-12:]})
