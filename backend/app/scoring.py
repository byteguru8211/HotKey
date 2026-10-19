"""Игровая математика: метрики сессии, опыт, уровни, ранги и разблокировки."""

from __future__ import annotations

MODES = {
    "words": {
        "title": "Слова",
        "short": "Слова",
        "description": "Случайные слова из словаря — база для постановки ритма.",
        "icon": "text",
        "min_level": 1,
    },
    "sentences": {
        "title": "Предложения",
        "short": "Фразы",
        "description": "Связный текст с пунктуацией: учимся держать темп на длинной дистанции.",
        "icon": "quote",
        "min_level": 1,
    },
    "symbols": {
        "title": "Символы",
        "short": "Символы",
        "description": "Цифры и спецсимволы — тренировка верхнего ряда и Shift.",
        "icon": "hash",
        "min_level": 2,
    },
    "code": {
        "title": "Код",
        "short": "Код",
        "description": "Python, JavaScript, HTML и CSS — печатаем реальные фрагменты.",
        "icon": "code",
        "min_level": 2,
    },
}

DIFFICULTIES = {
    "easy": {"title": "Разминка", "description": "Короткие слова и простые фразы", "min_level": 1},
    "normal": {"title": "Ритм", "description": "Рабочий темп на каждый день", "min_level": 1},
    "hard": {"title": "Нагрузка", "description": "Длинные слова и плотная пунктуация", "min_level": 3},
    "expert": {"title": "Испытание", "description": "Максимальная сложность и скорость", "min_level": 4},
}

LANGUAGES = {
    "ru": {"title": "Русский", "layout": "ru"},
    "en": {"title": "English", "layout": "en"},
}

LEVEL_STEP_BASE = 300
LEVEL_STEP_GROWTH = 200
MAX_LEVEL = 40

RANKS = [
    (1, "Новобранец"),
    (2, "Ученик"),
    (4, "Печатник"),
    (6, "Скороход"),
    (9, "Мастер"),
    (13, "Виртуоз"),
    (18, "Легенда"),
]

MODE_MULTIPLIER = {"words": 1.0, "sentences": 1.05, "symbols": 1.15, "code": 1.1}
DIFFICULTY_MULTIPLIER = {"easy": 0.9, "normal": 1.0, "hard": 1.15, "expert": 1.3}


def xp_needed_for_level(level: int) -> int:
    """Сколько опыта нужно, чтобы перейти с `level` на следующий уровень."""
    return LEVEL_STEP_BASE + LEVEL_STEP_GROWTH * (max(1, level) - 1)


def level_progress(xp: int) -> dict:
    xp = max(0, int(xp or 0))
    level = 1
    floor_xp = 0
    need = xp_needed_for_level(level)
    while xp >= floor_xp + need and level < MAX_LEVEL:
        floor_xp += need
        level += 1
        need = xp_needed_for_level(level)
    into_level = xp - floor_xp
    return {
        "level": level,
        "xp": xp,
        "level_floor_xp": floor_xp,
        "level_ceiling_xp": floor_xp + need,
        "xp_into_level": into_level,
        "xp_to_next": max(0, need - into_level),
        "xp_for_level": need,
        "percent": round(min(100.0, into_level / need * 100), 1) if need else 100.0,
        "max_level": level >= MAX_LEVEL,
    }


def rank_for_level(level: int) -> str:
    rank = RANKS[0][1]
    for minimum, title in RANKS:
        if level >= minimum:
            rank = title
    return rank


def unlocked_content(level: int) -> dict:
    return {
        "modes": [code for code, meta in MODES.items() if level >= meta["min_level"]],
        "difficulties": [
            code for code, meta in DIFFICULTIES.items() if level >= meta["min_level"]
        ],
    }


def compute_metrics(correct_chars: int, errors: int, duration_sec: int) -> dict:
    typed = correct_chars + errors
    duration = max(duration_sec, 1)
    accuracy = (correct_chars / typed * 100) if typed else 0.0
    cpm = correct_chars / duration * 60
    wpm = (correct_chars / 5) / duration * 60
    return {
        "typed_chars": typed,
        "accuracy": round(accuracy, 2),
        "cpm": round(cpm, 1),
        "wpm": round(wpm, 1),
    }


def compute_xp(
    *,
    correct_chars: int,
    accuracy: float,
    max_combo: int,
    mode: str,
    difficulty: str,
    bonus_count: int,
) -> dict:
    """Опыт за тренировку. Чем точнее и стабильнее печать, тем выше множители."""
    base = float(correct_chars)
    accuracy_multiplier = 1 + max(0.0, min(100.0, accuracy) - 90.0) * 0.02  # до x1.2
    combo_multiplier = 1 + min(max_combo, 200) / 1000  # до x1.2
    mode_multiplier = MODE_MULTIPLIER.get(mode, 1.0)
    difficulty_multiplier = DIFFICULTY_MULTIPLIER.get(difficulty, 1.0)
    bonus_multiplier = 1 + min(max(bonus_count, 0), 8) * 0.025  # до x1.2

    raw = base * accuracy_multiplier * combo_multiplier * mode_multiplier * difficulty_multiplier
    total = round(raw * bonus_multiplier)
    total = max(0, min(total, 5000))
    return {
        "total": total,
        "base": round(raw),
        "accuracy_multiplier": round(accuracy_multiplier, 2),
        "combo_multiplier": round(combo_multiplier, 2),
        "mode_multiplier": mode_multiplier,
        "difficulty_multiplier": difficulty_multiplier,
        "bonus_multiplier": round(bonus_multiplier, 2),
    }


def combo_multiplier(combo: int) -> int:
    if combo >= 100:
        return 5
    if combo >= 50:
        return 3
    if combo >= 25:
        return 2
    return 1


def serialize_catalog() -> dict:
    return {
        "modes": [
            {"code": code, **meta, "unlocked": meta["min_level"] <= 1} for code, meta in MODES.items()
        ],
        "difficulties": [
            {"code": code, **meta, "unlocked": meta["min_level"] <= 1}
            for code, meta in DIFFICULTIES.items()
        ],
        "languages": [{"code": code, **meta} for code, meta in LANGUAGES.items()],
    }
