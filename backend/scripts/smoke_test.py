"""Смоук-тест API без внешних зависимостей: python scripts/smoke_test.py.

Создаёт тестового пользователя со случайной почтой, проходит полный сценарий
(регистрация → тренировка → статистика → рейтинг → достижения) и печатает отчёт.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402

PASSED = 0
FAILED = 0


def check(name: str, condition: bool, details: str = "") -> None:
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  OK  {name}")
    else:
        FAILED += 1
        print(f" FAIL {name} {details}")


def main() -> int:
    app = create_app()
    app.config.update(TESTING=True)
    client = app.test_client()

    print("\n== Публичные эндпоинты ==")
    health = client.get("/api/health")
    check("health 200", health.status_code == 200, health.status_code)

    catalog = client.get("/api/practice/catalog").get_json()["data"]
    check("каталог содержит 4 режима", len(catalog["modes"]) == 4)
    check("каталог содержит 2 языка", len(catalog["languages"]) == 2)
    check("каталог содержит 4 сложности", len(catalog["difficulties"]) == 4)

    for mode, variant in (("words", None), ("sentences", None), ("symbols", None), ("code", "python"), ("code", "javascript"), ("code", "html"), ("code", "css")):
        url = f"/api/practice/text?mode={mode}&language=ru&difficulty=normal&duration=60"
        if variant:
            url += f"&variant={variant}"
        response = client.get(url)
        payload = response.get_json()
        check(f"текст {mode}/{variant or '-'}", response.status_code == 200 and len(payload["data"]["text"]) > 100)

    leaderboard = client.get("/api/leaderboard?period=all&metric=cpm").get_json()["data"]
    check("рейтинг содержит демо-игроков", len(leaderboard["entries"]) >= 5, len(leaderboard["entries"]))

    print("\n== Аккаунт ==")
    unique = uuid.uuid4().hex[:8]
    email = f"smoke_{unique}@example.com"
    registration = client.post(
        "/api/auth/register",
        json={"email": email, "username": f"Тестер {unique[:4]}", "password": "hero-password-123"},
    )
    check("регистрация 201", registration.status_code == 201, registration.get_json())
    token = registration.get_json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    check("повторная почта отклонена", client.post(
        "/api/auth/register",
        json={"email": email, "username": f"Другой {unique[:4]}", "password": "hero-password-123"},
    ).status_code == 409)
    check("короткий пароль отклонён", client.post(
        "/api/auth/register",
        json={"email": f"x{unique}@example.com", "username": "Короткий", "password": "123"},
    ).status_code == 400)
    check("вход работает", client.post(
        "/api/auth/login", json={"email": email, "password": "hero-password-123"}
    ).status_code == 200)
    check("неверный пароль отклонён", client.post(
        "/api/auth/login", json={"email": email, "password": "wrong-password"}
    ).status_code == 401)

    me = client.get("/api/auth/me", headers=headers).get_json()["data"]
    check("профиль доступен", me["email"] == email)
    check("стартовый уровень", me["level"] == 1, me["level"])

    print("\n== Сохранение тренировки ==")
    char_stats = {
        "а": {"attempts": 120, "errors": 4},
        "о": {"attempts": 110, "errors": 1},
        "пробел": {"attempts": 150, "errors": 2},
        "к": {"attempts": 60, "errors": 9},
    }
    payload = {
        "mode": "words",
        "language": "ru",
        "difficulty": "normal",
        "duration_sec": 60,
        "correct_chars": 320,
        "errors": 7,
        "max_combo": 140,
        "bonus_count": 3,
        "char_stats": char_stats,
    }
    saved = client.post("/api/practice/sessions", json=payload, headers=headers)
    check("сессия сохранена 201", saved.status_code == 201, saved.get_json())
    result = saved.get_json()["data"]
    session = result["session"]
    check("CPM рассчитан сервером", session["cpm"] == 320, session["cpm"])
    check("точность рассчитана", round(session["accuracy"], 1) == 97.9, session["accuracy"])
    check("опыт начислен", result["xp"]["total_after"] > 0, result["xp"])
    check("уровень повышен", result["level_after"]["level"] >= 2, result["level_after"])
    check("достижения выданы", len(result["achievements"]) >= 1, result["achievements"])
    check("открылись новые режимы", "code" in result["user"]["unlocks"]["modes"], result["unlocks"])

    check("пустая сессия отклонена", client.post(
        "/api/practice/sessions",
        json={**payload, "correct_chars": 0, "errors": 0},
        headers=headers,
    ).status_code == 422)
    check("нереальная скорость отклонена", client.post(
        "/api/practice/sessions",
        json={**payload, "correct_chars": 9000, "errors": 0, "duration_sec": 60},
        headers=headers,
    ).status_code == 422)

    print("\n== Статистика ==")
    overview = client.get("/api/stats/overview", headers=headers).get_json()["data"]
    check("сводка: одна сессия", overview["totals"]["sessions"] == 1, overview["totals"])
    check("сводка: символы", overview["totals"]["chars"] == 320)
    check("дневная цель задана", overview["today"]["goal"] > 0)
    check("режимы посчитаны", len(overview["modes"]) == 1)
    check("достижения посчитаны", overview["achievements"]["unlocked"] >= 1)

    daily = client.get("/api/stats/daily?days=14", headers=headers).get_json()["data"]
    check("график: 14 точек", len(daily["days"]) == 14)
    check("график: сегодня есть данные", daily["days"][-1]["chars"] == 320, daily["days"][-1])

    characters = client.get("/api/stats/characters?min_attempts=4", headers=headers).get_json()["data"]
    check("проблемные символы найдены", len(characters["hardest"]) >= 1)
    check("самый проблемный символ — «к»", characters["hardest"][0]["symbol"] == "к", characters["hardest"][:2])

    sessions = client.get("/api/stats/sessions", headers=headers).get_json()["data"]
    check("история тренировок", len(sessions["items"]) == 1)

    activity = client.get("/api/stats/activity", headers=headers).get_json()["data"]
    check("календарь активности", len(activity["weeks"]) > 0)

    print("\n== Рейтинг и достижения ==")
    board = client.get("/api/leaderboard?period=today&metric=xp", headers=headers).get_json()["data"]
    check("я в рейтинге", board["me"] is not None, board["me"])
    check("позиция присвоена", board["me"]["rank"] >= 1)

    achievements = client.get("/api/achievements", headers=headers).get_json()["data"]
    check("каталог достижений", achievements["total_count"] >= 15, achievements["total_count"])
    check("есть разблокированные", achievements["unlocked_count"] >= 1)
    check("есть прогресс", any(item["progress"]["target"] > 0 for item in achievements["items"]))

    print("\n== Профиль ==")
    updated = client.patch("/api/profile", json={"sound_enabled": False, "preferred_language": "en"}, headers=headers)
    check("настройки сохранены", updated.status_code == 200 and updated.get_json()["data"]["user"]["sound_enabled"] is False)
    password = client.post(
        "/api/auth/password",
        json={"current_password": "hero-password-123", "new_password": "hero-password-456"},
        headers=headers,
    )
    check("пароль изменён", password.status_code == 200)
    check("вход с новым паролем", client.post(
        "/api/auth/login", json={"email": email, "password": "hero-password-456"}
    ).status_code == 200)
    check("защита без токена", client.get("/api/stats/overview").status_code == 401)

    print(f"\nИтог: {PASSED} успешно, {FAILED} провалено")
    return 0 if FAILED == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
