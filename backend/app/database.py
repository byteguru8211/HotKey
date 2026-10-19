"""Подготовка подключения к базе данных и первичная инициализация схемы."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote, urlparse

import psycopg
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from .extensions import db


def _log(app, message: str) -> None:
    app.logger.warning(message)


def _postgres_dsn(url: str, database: str | None = None) -> str:
    parsed = urlparse(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5432
    user = unquote(parsed.username or "postgres")
    password = unquote(parsed.password or "")
    db_name = database or (parsed.path or "/postgres").lstrip("/") or "postgres"
    auth = user if not password else f"{user}:{password}"
    return f"postgresql://{auth}@{host}:{port}/{db_name}"


def _ensure_postgres_database(app, url: str) -> bool:
    """Проверяет доступность PostgreSQL и создаёт базу, если её ещё нет."""
    try:
        target = urlparse(url)
        db_name = (target.path or "").lstrip("/")
        with psycopg.connect(_postgres_dsn(url, "postgres"), connect_timeout=3, autocommit=True) as conn:
            if db_name:
                exists = conn.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s", (db_name,)
                ).fetchone()
                if not exists:
                    safe_name = db_name.replace('"', '""')
                    conn.execute(f'CREATE DATABASE "{safe_name}"')
                    app.logger.info("Создана база данных PostgreSQL: %s", db_name)
        return True
    except Exception as error:  # noqa: BLE001 — нужна мягкая деградация
        _log(app, f"PostgreSQL недоступен ({error.__class__.__name__}): {error}")
        return False


def resolve_database(app) -> str:
    config = app.config
    url = config["DATABASE_URL"]
    is_sqlite = url.startswith("sqlite")

    if is_sqlite:
        Path(config["SQLITE_PATH"]).parent.mkdir(parents=True, exist_ok=True)
        return url

    if _ensure_postgres_database(app, url):
        return url

    if config["ALLOW_SQLITE_FALLBACK"]:
        config["SQLITE_PATH"].parent.mkdir(parents=True, exist_ok=True)
        fallback = f"sqlite:///{config['SQLITE_PATH'].as_posix()}"
        app.logger.warning(
            "PostgreSQL недоступен — приложение запущено на локальной SQLite (%s). "
            "Для полноценного режима укажите DATABASE_URL к PostgreSQL.",
            config["SQLITE_PATH"].name,
        )
        return fallback

    raise RuntimeError(
        "PostgreSQL недоступен, а резервный режим отключён. "
        "Установите PostgreSQL или задайте ALLOW_SQLITE_FALLBACK=1."
    )


def init_database(app) -> None:
    uri = resolve_database(app)
    app.config["SQLALCHEMY_DATABASE_URI"] = uri
    db.init_app(app)

    with app.app_context():
        from . import models  # noqa: F401 — регистрирует таблицы в metadata
        from .seed import seed_demo_data

        db.create_all()
        if app.config.get("SEED_DEMO_DATA", True):
            try:
                seed_demo_data()
            except SQLAlchemyError as error:
                app.logger.warning("Не удалось заполнить демо-данные: %s", error)
                db.session.rollback()

    # Проверяем, что соединение действительно работает, и печатаем понятный лог.
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
            db.session.remove()
            app.logger.info("База данных готова: %s", make_url(uri).render_as_string(hide_password=True))
        except SQLAlchemyError as error:
            app.logger.error("Ошибка подключения к базе данных: %s", error)

    if uri.startswith("sqlite"):
        app.config["DATABASE_KIND"] = "sqlite"
    else:
        app.config["DATABASE_KIND"] = "postgresql"
