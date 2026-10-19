"""Демонстрационные данные: правдоподобный рейтинг на старте приложения."""

from __future__ import annotations

import random
from datetime import datetime, time, timedelta

from .extensions import db
from .models import TypingSession, User
from .scoring import compute_metrics, compute_xp, level_progress
from .timeutil import local_today, to_utc_naive, utcnow

DEMO_HEROES = [
    {"username": "Алиса Ковалёва", "cpm": 344, "accuracy": 98.7, "days": 13},
    {"username": "nordwind", "cpm": 412, "accuracy": 97.9, "days": 12},
    {"username": "Максим Р.", "cpm": 287, "accuracy": 99.1, "days": 11},
    {"username": "codefox", "cpm": 366, "accuracy": 96.8, "days": 13},
    {"username": "Ирина_Л", "cpm": 241, "accuracy": 98.4, "days": 9},
    {"username": "Тихий Шторм", "cpm": 198, "accuracy": 97.2, "days": 7},
    {"username": "dmitry.k", "cpm": 309, "accuracy": 95.9, "days": 12},
    {"username": "Соня", "cpm": 275, "accuracy": 99.3, "days": 10},
    {"username": "Артём В.", "cpm": 224, "accuracy": 96.5, "days": 8},
    {"username": "keymaster", "cpm": 395, "accuracy": 96.1, "days": 14},
    {"username": "Лада", "cpm": 262, "accuracy": 98.9, "days": 6},
    {"username": "syntax_error", "cpm": 318, "accuracy": 94.7, "days": 9},
]

MODES = [("words", "ru", "normal"), ("sentences", "ru", "normal"), ("code", "en", "hard"), ("symbols", "ru", "normal"), ("words", "en", "easy")]


def seed_demo_data() -> None:
    if User.query.filter_by(is_demo=True).count() > 0:
        return

    rng = random.Random(20261019)
    now = utcnow()
    today = local_today()

    for index, hero in enumerate(DEMO_HEROES):
        user = User(
            email=f"{hero['username'].lower().replace(' ', '.').replace('ё', 'e')}@herotyping.local",
            username=hero["username"],
            username_key=hero["username"].lower(),
            is_demo=True,
            created_at=now - timedelta(days=60 + index),
            last_seen_at=now - timedelta(hours=rng.randint(1, 30)),
            xp=0,
            level=1,
        )
        user.set_password(f"demo-{rng.random()}-{index}")
        db.session.add(user)
        db.session.flush()

        session_rows = []
        active_days = set()
        for offset in range(hero["days"]):
            day = today - timedelta(days=offset)
            # у части героев бывают пропуски — иначе рейтинг выглядит слишком ровным
            if offset > 0 and rng.random() < 0.22:
                continue
            runs = 1 if offset > 0 else 2
            if rng.random() < 0.35:
                runs += 1
            for _ in range(runs):
                duration = rng.choice([60, 60, 60, 90, 120, 30])
                cpm = hero["cpm"] * rng.uniform(0.84, 1.07)
                correct = max(20, int(cpm / 60 * duration))
                errors = max(0, round(correct * (100 - hero["accuracy"]) / hero["accuracy"] * rng.uniform(0.6, 1.3)))
                accuracy = correct / max(1, correct + errors) * 100
                max_combo = max(8, int(correct * rng.uniform(0.45, 0.92)))
                mode, language, difficulty = rng.choice(MODES)
                bonus_count = rng.randint(0, 3)
                xp = compute_xp(
                    correct_chars=correct,
                    accuracy=accuracy,
                    max_combo=max_combo,
                    mode=mode,
                    difficulty=difficulty,
                    bonus_count=bonus_count,
                )["total"]

                if offset == 0:
                    created = now - timedelta(minutes=rng.randint(25, 300))
                else:
                    created = to_utc_naive(
                        datetime.combine(day, time(rng.randint(8, 22), rng.randint(0, 59)))
                    )

                metrics = compute_metrics(correct, errors, duration)
                session_rows.append(
                    TypingSession(
                        user_id=user.id,
                        mode=mode,
                        language=language,
                        difficulty=difficulty,
                        variant="python" if mode == "code" else None,
                        is_night=created.hour < 5,
                        duration_sec=duration,
                        correct_chars=correct,
                        errors=errors,
                        typed_chars=metrics["typed_chars"],
                        accuracy=metrics["accuracy"],
                        cpm=metrics["cpm"],
                        wpm=metrics["wpm"],
                        max_combo=max_combo,
                        bonus_count=bonus_count,
                        xp_earned=xp,
                        created_at=created,
                    )
                )
                active_days.add(day)

        db.session.add_all(session_rows)
        total_xp = sum(row.xp_earned for row in session_rows)
        user.xp = total_xp
        user.level = level_progress(total_xp)["level"]
        user.total_sessions = len(session_rows)
        user.total_chars = sum(row.correct_chars for row in session_rows)
        user.total_errors = sum(row.errors for row in session_rows)
        user.total_seconds = sum(row.duration_sec for row in session_rows)
        user.best_cpm = max((row.cpm for row in session_rows), default=0)
        user.best_wpm = max((row.wpm for row in session_rows), default=0)
        user.best_accuracy = max((row.accuracy for row in session_rows), default=0)
        user.best_combo = max((row.max_combo for row in session_rows), default=0)
        user.last_practice_date = max(active_days) if active_days else None
        user.streak_days, user.longest_streak = _streaks(active_days, today)
        db.session.flush()

    db.session.commit()


def _streaks(active_days: set, today) -> tuple[int, int]:
    if not active_days:
        return 0, 0
    ordered = sorted(active_days)
    longest = current = 1
    for previous, day in zip(ordered, ordered[1:]):
        if (day - previous).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    streak = 0
    cursor = today
    if today not in active_days:
        cursor = today - timedelta(days=1)
        if cursor not in active_days:
            return 0, longest
    while cursor in active_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak, max(longest, streak)
