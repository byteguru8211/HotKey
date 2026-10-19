import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
PROJECT_ROOT = BASE_DIR.parent                             # корень репозитория
INSTANCE_DIR = BASE_DIR / "instance"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

load_dotenv(BASE_DIR / ".env")

DEFAULT_DATABASE_URL = os.getenv(
    "DEFAULT_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/hero_typing",
)


def normalize_database_url(url: str) -> str:
    """Приводит DSN к драйверу psycopg (PostgreSQL 3.x)."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "hero-typing-dev-secret-change-me")
    JWT_ALGORITHM = "HS256"
    JWT_LIFETIME_DAYS = int(os.getenv("JWT_LIFETIME_DAYS", "30"))

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    JSON_AS_ASCII = False
    SEED_DEMO_DATA = os.getenv("SEED_DEMO_DATA", "1") not in {"0", "false", "False"}
    ALLOW_SQLITE_FALLBACK = os.getenv("ALLOW_SQLITE_FALLBACK", "1") not in {"0", "false", "False"}
    DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    SQLITE_PATH = INSTANCE_DIR / "hero_typing.sqlite3"
