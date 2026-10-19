"""Система достижений: определения, контекст пользователя и вычисление прогресса."""

from __future__ import annotations

from sqlalchemy import func

from .extensions import db
from .models import TypingSession, UserAchievement
from .timeutil import day_start_utc, local_today


def _session_query(user_id: int):
    return TypingSession.query.filter(TypingSession.user_id == user_id)


def build_context(user) -> dict:
    """Один раз собирает агрегаты, по которым проверяются все достижения."""
    user_id = user.id
    q = _session_query(user_id)
    perfect_sessions = q.filter(
        TypingSession.accuracy >= 99.99,
        TypingSession.duration_sec >= 30,
        TypingSession.correct_chars >= 50,
    ).count()
    precise_sessions = q.filter(
        TypingSession.accuracy >= 98,
        TypingSession.duration_sec >= 20,
        TypingSession.correct_chars >= 40,
    ).count()
    code_sessions = q.filter(
        TypingSession.mode == "code",
        TypingSession.accuracy >= 97,
        TypingSession.correct_chars >= 60,
    ).count()
    symbol_sessions = q.filter(
        TypingSession.mode == "symbols",
        TypingSession.accuracy >= 95,
        TypingSession.correct_chars >= 60,
    ).count()
    expert_sessions = q.filter(
        TypingSession.difficulty == "expert",
        TypingSession.accuracy >= 95,
        TypingSession.correct_chars >= 80,
    ).count()
    night_sessions = q.filter(TypingSession.is_night.is_(True)).count()

    today = local_today()
    today_start = day_start_utc(today)
    tomorrow_start = day_start_utc(today.fromordinal(today.toordinal() + 1))
    today_chars = (
        db.session.query(func.coalesce(func.sum(TypingSession.correct_chars), 0))
        .filter(
            TypingSession.user_id == user_id,
            TypingSession.created_at >= today_start,
            TypingSession.created_at < tomorrow_start,
        )
        .scalar()
        or 0
    )
    best_code_accuracy = (
        db.session.query(func.coalesce(func.max(TypingSession.accuracy), 0))
        .filter(TypingSession.user_id == user_id, TypingSession.mode == "code")
        .scalar()
        or 0
    )
    best_symbol_accuracy = (
        db.session.query(func.coalesce(func.max(TypingSession.accuracy), 0))
        .filter(TypingSession.user_id == user_id, TypingSession.mode == "symbols")
        .scalar()
        or 0
    )

    return {
        "total_sessions": user.total_sessions or 0,
        "total_chars": user.total_chars or 0,
        "best_cpm": user.best_cpm or 0,
        "best_wpm": user.best_wpm or 0,
        "best_combo": user.best_combo or 0,
        "longest_streak": user.longest_streak or 0,
        "xp": user.xp or 0,
        "perfect_sessions": perfect_sessions,
        "precise_sessions": precise_sessions,
        "code_sessions": code_sessions,
        "symbol_sessions": symbol_sessions,
        "expert_sessions": expert_sessions,
        "night_sessions": night_sessions,
        "today_chars": int(today_chars),
        "best_code_accuracy": round(best_code_accuracy, 2),
        "best_symbol_accuracy": round(best_symbol_accuracy, 2),
    }


def _p(current, target, label="") -> dict:
    current = round(current, 1) if isinstance(current, float) else int(current)
    return {"current": current, "target": target, "percent": round(min(100, current / target * 100), 1) if target else 100, "label": label}


ACHIEVEMENTS = [
    {
        "code": "first_steps",
        "title": "Первый удар",
        "description": "Завершите первую тренировку.",
        "hint": "Выберите режим и дойдите до экрана результатов.",
        "tier": "bronze",
        "icon": "spark",
        "xp": 40,
        "category": "Путь",
        "check": lambda s, c: c["total_sessions"] >= 1,
        "progress": lambda c: _p(min(c["total_sessions"], 1), 1),
    },
    {
        "code": "warmup",
        "title": "Разминка",
        "description": "Наберите 500 символов за всё время.",
        "hint": "Пять минут спокойной практики.",
        "tier": "bronze",
        "icon": "keyboard",
        "xp": 60,
        "category": "Путь",
        "check": lambda s, c: c["total_chars"] >= 500,
        "progress": lambda c: _p(c["total_chars"], 500),
    },
    {
        "code": "marathon_10",
        "title": "В ритме",
        "description": "Завершите 10 тренировок.",
        "hint": "Регулярность важнее длительности.",
        "tier": "silver",
        "icon": "calendar",
        "xp": 140,
        "category": "Путь",
        "check": lambda s, c: c["total_sessions"] >= 10,
        "progress": lambda c: _p(c["total_sessions"], 10),
    },
    {
        "code": "marathon_50",
        "title": "Марафонец",
        "description": "Завершите 50 тренировок.",
        "hint": "Полсотни заходов — и пальцы всё делают сами.",
        "tier": "gold",
        "icon": "medal",
        "xp": 400,
        "category": "Путь",
        "check": lambda s, c: c["total_sessions"] >= 50,
        "progress": lambda c: _p(c["total_sessions"], 50),
    },
    {
        "code": "streak_3",
        "title": "Три дня подряд",
        "description": "Тренируйтесь три дня без пропусков.",
        "hint": "Продолжайте серию дней.",
        "tier": "bronze",
        "icon": "flame",
        "xp": 100,
        "category": "Серии",
        "check": lambda s, c: c["longest_streak"] >= 3,
        "progress": lambda c: _p(c["longest_streak"], 3),
    },
    {
        "code": "streak_7",
        "title": "Неделя силы",
        "description": "Тренируйтесь семь дней подряд.",
        "hint": "Серия из семи дней поднимает дисциплину.",
        "tier": "gold",
        "icon": "flame",
        "xp": 300,
        "category": "Серии",
        "check": lambda s, c: c["longest_streak"] >= 7,
        "progress": lambda c: _p(c["longest_streak"], 7),
    },
    {
        "code": "perfect_run",
        "title": "Безупречно",
        "description": "Тренировка от 30 секунд с точностью 100%.",
        "hint": "Не спешите: ни одной ошибки за весь заход.",
        "tier": "silver",
        "icon": "target",
        "xp": 180,
        "category": "Точность",
        "check": lambda s, c: c["perfect_sessions"] >= 1,
        "progress": lambda c: _p(min(c["perfect_sessions"], 1), 1),
    },
    {
        "code": "sniper_10",
        "title": "Снайпер",
        "description": "10 тренировок с точностью не ниже 98%.",
        "hint": "Точность важнее скорости.",
        "tier": "gold",
        "icon": "crosshair",
        "xp": 260,
        "category": "Точность",
        "check": lambda s, c: c["precise_sessions"] >= 10,
        "progress": lambda c: _p(c["precise_sessions"], 10),
    },
    {
        "code": "combo_100",
        "title": "Комбо-мастер",
        "description": "Серия из 100 правильных нажатий.",
        "hint": "Держите ровный ритм без ошибок.",
        "tier": "silver",
        "icon": "zap",
        "xp": 150,
        "category": "Комбо",
        "check": lambda s, c: c["best_combo"] >= 100,
        "progress": lambda c: _p(c["best_combo"], 100),
    },
    {
        "code": "combo_250",
        "title": "Неудержимый",
        "description": "Серия из 250 правильных нажатий.",
        "hint": "Длинный заход и полная концентрация.",
        "tier": "gold",
        "icon": "zap",
        "xp": 250,
        "category": "Комбо",
        "check": lambda s, c: c["best_combo"] >= 250,
        "progress": lambda c: _p(c["best_combo"], 250),
    },
    {
        "code": "steel_finger",
        "title": "Стальной палец",
        "description": "1000 правильных нажатий подряд.",
        "hint": "Многосекундный марафон без единой ошибки.",
        "tier": "legend",
        "icon": "fingerprint",
        "xp": 400,
        "category": "Комбо",
        "check": lambda s, c: c["best_combo"] >= 1000,
        "progress": lambda c: _p(c["best_combo"], 1000),
    },
    {
        "code": "speed_200",
        "title": "Разогрев",
        "description": "Достигните скорости 200 символов в минуту.",
        "hint": "200 CPM — уверенный рабочий темп.",
        "tier": "silver",
        "icon": "gauge",
        "xp": 150,
        "category": "Скорость",
        "check": lambda s, c: c["best_cpm"] >= 200,
        "progress": lambda c: _p(c["best_cpm"], 200),
    },
    {
        "code": "speed_300",
        "title": "Печатный гений",
        "description": "Достигните скорости 300 символов в минуту.",
        "hint": "Только тренировка и ещё раз тренировка.",
        "tier": "gold",
        "icon": "rocket",
        "xp": 350,
        "category": "Скорость",
        "check": lambda s, c: c["best_cpm"] >= 300,
        "progress": lambda c: _p(c["best_cpm"], 300),
    },
    {
        "code": "wpm_100",
        "title": "Сотка",
        "description": "Достигните скорости 100 слов в минуту.",
        "hint": "100 WPM — уровень уверенного профессионала.",
        "tier": "legend",
        "icon": "crown",
        "xp": 400,
        "category": "Скорость",
        "check": lambda s, c: c["best_wpm"] >= 100,
        "progress": lambda c: _p(c["best_wpm"], 100),
    },
    {
        "code": "code_ninja",
        "title": "Код-ниндзя",
        "description": "Точность не ниже 97% в режиме «Код».",
        "hint": "Скобки, отступы и точка с запятой решают.",
        "tier": "silver",
        "icon": "code",
        "xp": 200,
        "category": "Режимы",
        "check": lambda s, c: c["code_sessions"] >= 1,
        "progress": lambda c: _p(c["best_code_accuracy"], 97),
    },
    {
        "code": "symbol_mage",
        "title": "Символьный маг",
        "description": "Точность не ниже 95% в режиме «Символы».",
        "hint": "Shift, цифры и скобки должны слушаться.",
        "tier": "silver",
        "icon": "hash",
        "xp": 200,
        "category": "Режимы",
        "check": lambda s, c: c["symbol_sessions"] >= 1,
        "progress": lambda c: _p(c["best_symbol_accuracy"], 95),
    },
    {
        "code": "expert_run",
        "title": "По-взрослому",
        "description": "Сложность «Испытание» с точностью не ниже 95%.",
        "hint": "Включите максимальную сложность и не сорвите ритм.",
        "tier": "gold",
        "icon": "swords",
        "xp": 250,
        "category": "Режимы",
        "check": lambda s, c: c["expert_sessions"] >= 1,
        "progress": lambda c: _p(min(c["expert_sessions"], 1), 1),
    },
    {
        "code": "night_shift",
        "title": "Ночная смена",
        "description": "Тренировка между полуночью и пятью утра.",
        "hint": "Иногда лучшие идеи приходят ночью.",
        "tier": "bronze",
        "icon": "moon",
        "xp": 100,
        "category": "Секреты",
        "check": lambda s, c: c["night_sessions"] >= 1,
        "progress": lambda c: _p(min(c["night_sessions"], 1), 1),
    },
    {
        "code": "daily_5000",
        "title": "Пять тысяч",
        "description": "Наберите 5000 символов за один день.",
        "hint": "Несколько длинных заходов подряд.",
        "tier": "gold",
        "icon": "sun",
        "xp": 300,
        "category": "Объём",
        "check": lambda s, c: c["today_chars"] >= 5000,
        "progress": lambda c: _p(c["today_chars"], 5000),
    },
    {
        "code": "xp_5000",
        "title": "Ветеран арены",
        "description": "Накопите 5000 опыта.",
        "hint": "Опыт растёт с точностью, комбо и сложностью.",
        "tier": "legend",
        "icon": "shield",
        "xp": 300,
        "category": "Путь",
        "check": lambda s, c: c["xp"] >= 5000,
        "progress": lambda c: _p(c["xp"], 5000),
    },
]

ACHIEVEMENT_MAP = {a["code"]: a for a in ACHIEVEMENTS}


def public_definition(achievement: dict) -> dict:
    return {
        "code": achievement["code"],
        "title": achievement["title"],
        "description": achievement["description"],
        "hint": achievement["hint"],
        "tier": achievement["tier"],
        "icon": achievement["icon"],
        "xp": achievement["xp"],
        "category": achievement["category"],
    }


def evaluate(user, session, context=None) -> list[dict]:
    """Возвращает определения достижений, которые открылись именно сейчас."""
    context = context or build_context(user)
    unlocked = {code for (code,) in db.session.query(UserAchievement.code).filter_by(user_id=user.id)}
    fresh = []
    for achievement in ACHIEVEMENTS:
        if achievement["code"] in unlocked:
            continue
        try:
            if achievement["check"](session, context):
                fresh.append(achievement)
        except Exception:  # защита от неожиданных данных в истории
            continue
    return fresh


def unlock(user, achievements: list[dict]) -> None:
    for achievement in achievements:
        db.session.add(UserAchievement(user_id=user.id, code=achievement["code"]))


def list_with_progress(user) -> dict:
    context = build_context(user)
    unlocked_rows = {
        row.code: row.unlocked_at
        for row in UserAchievement.query.filter_by(user_id=user.id).all()
    }
    items = []
    for achievement in ACHIEVEMENTS:
        item = public_definition(achievement)
        item["unlocked"] = achievement["code"] in unlocked_rows
        item["unlocked_at"] = (
            unlocked_rows[achievement["code"]].isoformat() + "Z"
            if achievement["code"] in unlocked_rows
            else None
        )
        item["progress"] = achievement["progress"](context)
        items.append(item)
    unlocked_count = sum(1 for item in items if item["unlocked"])
    return {
        "items": items,
        "unlocked_count": unlocked_count,
        "total_count": len(items),
        "xp_from_achievements": sum(
            achievement["xp"] for achievement in ACHIEVEMENTS if achievement["code"] in unlocked_rows
        ),
    }
