"""Практика: каталог режимов, генерация текста и сохранение результатов."""

from __future__ import annotations


from flask import Blueprint, request

from .. import achievements as achievements_service
from ..auth import current_user, login_required
from ..content import CODE_LANGUAGES, generate_text
from ..errors import ApiError, ok
from ..extensions import db
from ..models import TypingSession, UserCharStat
from ..timeutil import local_now, utcnow
from ..scoring import (
    DIFFICULTIES,
    LANGUAGES,
    MODES,
    compute_metrics,
    compute_xp,
    level_progress,
    rank_for_level,
    serialize_catalog,
    unlocked_content,
)

bp = Blueprint("practice", __name__, url_prefix="/api/practice")

DURATIONS = [15, 30, 60, 120]
MAX_CPM = 1500


def _catalog_for(user) -> dict:
    catalog = serialize_catalog()
    level = user.level if user else 1
    unlocked = unlocked_content(level)
    for mode in catalog["modes"]:
        mode["unlocked"] = mode["code"] in unlocked["modes"]
        mode["min_level"] = MODES[mode["code"]]["min_level"]
    for difficulty in catalog["difficulties"]:
        difficulty["unlocked"] = difficulty["code"] in unlocked["difficulties"]
        difficulty["min_level"] = DIFFICULTIES[difficulty["code"]]["min_level"]
    catalog["durations"] = DURATIONS
    catalog["code_languages"] = [
        {"code": code, **meta} for code, meta in CODE_LANGUAGES.items()
    ]
    catalog["level"] = level
    catalog["authenticated"] = bool(user)
    return catalog


@bp.get("/catalog")
def catalog():
    return ok(_catalog_for(current_user()))


@bp.get("/text")
def text():
    mode = request.args.get("mode", "words")
    language = request.args.get("language", "ru")
    difficulty = request.args.get("difficulty", "normal")
    variant = request.args.get("variant", "python")
    try:
        duration = int(request.args.get("duration", 60))
    except ValueError:
        raise ApiError("Некорректная длительность", code="invalid_duration")

    if mode not in MODES:
        raise ApiError("Неизвестный режим печати", code="invalid_mode")
    if language not in LANGUAGES:
        raise ApiError("Неизвестный язык", code="invalid_language")
    if difficulty not in DIFFICULTIES:
        raise ApiError("Неизвестная сложность", code="invalid_difficulty")
    if duration not in DURATIONS:
        raise ApiError("Длительность должна быть 15, 30, 60 или 120 секунд", code="invalid_duration")
    if mode == "code" and variant not in CODE_LANGUAGES:
        raise ApiError("Неизвестный язык программирования", code="invalid_variant")

    user = current_user()
    if user is not None:
        unlocked = unlocked_content(user.level)
        if mode not in unlocked["modes"]:
            raise ApiError(
                f"Режим откроется на {MODES[mode]['min_level']} уровне",
                status=403,
                code="mode_locked",
                fields={"required_level": MODES[mode]["min_level"]},
            )
        if difficulty not in unlocked["difficulties"]:
            raise ApiError(
                f"Сложность откроется на {DIFFICULTIES[difficulty]['min_level']} уровне",
                status=403,
                code="difficulty_locked",
                fields={"required_level": DIFFICULTIES[difficulty]["min_level"]},
            )

    exercise = generate_text(mode, language, difficulty, variant=variant, duration=duration)
    exercise["mode_title"] = MODES[mode]["title"]
    exercise["language_title"] = LANGUAGES[language]["title"]
    if mode == "code":
        exercise["variant_title"] = CODE_LANGUAGES[variant]["title"]
    return ok(exercise)


def _clamp_int(value, minimum: int, maximum: int, field: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError("Некорректные данные сессии", status=422, code="invalid_session", fields={field: "Ожидается число"})
    if number < minimum or number > maximum:
        raise ApiError(
            "Некорректные данные сессии",
            status=422,
            code="invalid_session",
            fields={field: f"Допустимый диапазон: {minimum}–{maximum}"},
        )
    return number


@bp.post("/sessions")
@login_required
def create_session():
    user = current_user()
    payload = request.get_json(silent=True) or {}

    mode = payload.get("mode")
    language = payload.get("language")
    difficulty = payload.get("difficulty")
    variant = payload.get("variant")
    if mode not in MODES:
        raise ApiError("Неизвестный режим печати", status=422, code="invalid_mode")
    if language not in LANGUAGES:
        raise ApiError("Неизвестный язык", status=422, code="invalid_language")
    if difficulty not in DIFFICULTIES:
        raise ApiError("Неизвестная сложность", status=422, code="invalid_difficulty")
    if mode == "code" and variant not in CODE_LANGUAGES:
        variant = "python"

    unlocked = unlocked_content(user.level)
    if mode not in unlocked["modes"]:
        raise ApiError(
            f"Режим откроется на {MODES[mode]['min_level']} уровне",
            status=403,
            code="mode_locked",
        )
    if difficulty not in unlocked["difficulties"]:
        raise ApiError(
            f"Сложность откроется на {DIFFICULTIES[difficulty]['min_level']} уровне",
            status=403,
            code="difficulty_locked",
        )

    duration = _clamp_int(payload.get("duration_sec"), 5, 300, "duration_sec")
    correct = _clamp_int(payload.get("correct_chars"), 0, duration * 20, "correct_chars")
    errors = _clamp_int(payload.get("errors"), 0, duration * 12 + 20, "errors")
    max_combo = _clamp_int(
        payload.get("max_combo"),
        0,
        max(correct + errors + 100, 100),
        "max_combo",
    )
    bonus_count = _clamp_int(payload.get("bonus_count", 0), 0, 20, "bonus_count")

    if correct + errors == 0:
        raise ApiError("Пустая сессия не сохраняется", status=422, code="empty_session")

    cpm = correct / duration * 60
    if cpm > MAX_CPM:
        raise ApiError("Слишком высокая скорость для этой сессии", status=422, code="invalid_speed")

    metrics = compute_metrics(correct, errors, duration)
    xp_breakdown = compute_xp(
        correct_chars=correct,
        accuracy=metrics["accuracy"],
        max_combo=max_combo,
        mode=mode,
        difficulty=difficulty,
        bonus_count=bonus_count,
    )

    old_xp = user.xp or 0
    old_level = level_progress(old_xp)["level"]
    old_bests = {
        "cpm": user.best_cpm or 0,
        "wpm": user.best_wpm or 0,
        "accuracy": user.best_accuracy or 0,
        "combo": user.best_combo or 0,
    }

    created_at = utcnow()
    session_row = TypingSession(
        user_id=user.id,
        mode=mode,
        language=language,
        difficulty=difficulty,
        variant=variant if mode == "code" else None,
        is_night=0 <= local_now().hour < 5,
        duration_sec=duration,
        correct_chars=correct,
        errors=errors,
        typed_chars=metrics["typed_chars"],
        accuracy=metrics["accuracy"],
        cpm=metrics["cpm"],
        wpm=metrics["wpm"],
        max_combo=max_combo,
        bonus_count=bonus_count,
        xp_earned=xp_breakdown["total"],
        created_at=created_at,
    )
    db.session.add(session_row)

    user.total_sessions = (user.total_sessions or 0) + 1
    user.total_chars = (user.total_chars or 0) + correct
    user.total_errors = (user.total_errors or 0) + errors
    user.total_seconds = (user.total_seconds or 0) + duration
    user.best_cpm = max(user.best_cpm or 0, metrics["cpm"])
    user.best_wpm = max(user.best_wpm or 0, metrics["wpm"])
    user.best_accuracy = max(user.best_accuracy or 0, metrics["accuracy"])
    user.best_combo = max(user.best_combo or 0, max_combo)
    user.xp = old_xp + xp_breakdown["total"]
    user.touch_streak()
    user.last_seen_at = created_at

    _merge_char_stats(user.id, payload.get("char_stats"), metrics["typed_chars"])
    db.session.flush()

    context = achievements_service.build_context(user)
    fresh = achievements_service.evaluate(user, session_row, context)
    achievement_xp = sum(item["xp"] for item in fresh)
    if fresh:
        achievements_service.unlock(user, fresh)
        user.xp = (user.xp or 0) + achievement_xp
    db.session.flush()

    new_progress = level_progress(user.xp)
    user.level = new_progress["level"]
    db.session.commit()

    after_unlocks = unlocked_content(user.level)
    before_unlocks = unlocked_content(old_level)
    new_modes = [code for code in after_unlocks["modes"] if code not in before_unlocks["modes"]]
    new_difficulties = [
        code for code in after_unlocks["difficulties"] if code not in before_unlocks["difficulties"]
    ]

    bests = {
        "cpm": metrics["cpm"] > old_bests["cpm"] + 1e-9,
        "wpm": metrics["wpm"] > old_bests["wpm"] + 1e-9,
        "accuracy": metrics["accuracy"] > old_bests["accuracy"] + 1e-9 and metrics["accuracy"] >= 99,
        "combo": max_combo > old_bests["combo"],
    }

    return ok(
        {
            "session": session_row.as_dict(),
            "xp": {
                **xp_breakdown,
                "session_xp": xp_breakdown["total"],
                "achievement_xp": achievement_xp,
                "total_after": user.xp,
            },
            "level_before": {
                "level": old_level,
                "rank": rank_for_level(old_level),
            },
            "level_after": {
                "level": user.level,
                "rank": rank_for_level(user.level),
                "progress": new_progress,
            },
            "level_up": user.level > old_level,
            "achievements": [achievements_service.public_definition(item) for item in fresh],
            "unlocks": {"modes": new_modes, "difficulties": new_difficulties},
            "bests": bests,
            "streak_days": user.streak_days,
            "user": user.as_dict(),
        },
        status=201,
    )


def _merge_char_stats(user_id: int, raw, typed_chars: int) -> None:
    """Обновляет агрегированную статистику ошибок по символам."""
    if not isinstance(raw, dict) or not raw:
        return

    entries: dict[str, tuple[int, int]] = {}
    total_attempts = 0
    for symbol, value in list(raw.items())[:150]:
        if not isinstance(symbol, str) or not symbol or len(symbol) > 12:
            continue
        if not isinstance(value, dict):
            continue
        try:
            attempts = int(value.get("attempts", 0))
            errors = int(value.get("errors", 0))
        except (TypeError, ValueError):
            continue
        attempts = max(0, min(attempts, 5000))
        errors = max(0, min(errors, attempts))
        if attempts == 0:
            continue
        if total_attempts + attempts > max(typed_chars * 2, 100):
            break
        entries[symbol] = (attempts, errors)
        total_attempts += attempts

    if not entries:
        return

    existing = {
        row.symbol: row
        for row in UserCharStat.query.filter(
            UserCharStat.user_id == user_id, UserCharStat.symbol.in_(entries.keys())
        ).all()
    }
    for symbol, (attempts, errors) in entries.items():
        row = existing.get(symbol)
        if row is None:
            db.session.add(
                UserCharStat(user_id=user_id, symbol=symbol, attempts=attempts, errors=errors)
            )
        else:
            row.attempts += attempts
            row.errors += errors
    db.session.flush()
