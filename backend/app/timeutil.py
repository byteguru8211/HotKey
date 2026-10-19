"""Единая работа со временем: в БД храним UTC, дни считаем по часовому поясу арены."""

from __future__ import annotations

import os
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

try:
    ARENA_TZ = ZoneInfo(os.getenv("APP_TIMEZONE", "Europe/Moscow"))
except Exception:  # noqa: BLE001 — на случай отсутствия базы часовых поясов
    ARENA_TZ = timezone.utc


def utcnow() -> datetime:
    """Наивное UTC-время для хранения в базе."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_now() -> datetime:
    return datetime.now(ARENA_TZ)


def local_today() -> date:
    return local_now().date()


def to_local(naive_utc: datetime) -> datetime:
    if naive_utc is None:
        return None
    aware = naive_utc.replace(tzinfo=timezone.utc)
    return aware.astimezone(ARENA_TZ)


def to_utc_naive(local_dt: datetime) -> datetime:
    if local_dt.tzinfo is None:
        local_dt = local_dt.replace(tzinfo=ARENA_TZ)
    return local_dt.astimezone(timezone.utc).replace(tzinfo=None)


def day_start_utc(day: date) -> datetime:
    """Начало локального дня, выраженное в наивном UTC (для фильтров БД)."""
    return to_utc_naive(datetime.combine(day, time.min))


def day_key(naive_utc: datetime) -> date:
    return to_local(naive_utc).date()


def iso_utc(naive_utc: datetime) -> str | None:
    if naive_utc is None:
        return None
    return naive_utc.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
