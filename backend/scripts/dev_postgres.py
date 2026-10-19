"""Локальный PostgreSQL без установки СУБД (встроенные бинарники pgserver).

Запускает сервер, создаёт базу `hero_typing` и прописывает DATABASE_URL в backend/.env.
Сервер продолжает работать после выхода из скрипта — это удобно для разработки.

    pip install -r requirements-dev.txt
    python scripts/dev_postgres.py
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import pgserver
except ImportError:
    sys.exit(
        "Не найден пакет pgserver. Установите dev-зависимости:\n"
        "  pip install -r requirements-dev.txt"
    )

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PGDATA = ROOT / ".pgdata"
DEFAULT_ENV = ROOT / "backend" / ".env"


def update_env(env_path: Path, database_url: str) -> None:
    env_path.parent.mkdir(parents=True, exist_ok=True)
    if env_path.exists():
        text = env_path.read_text(encoding="utf-8")
    elif (ROOT / "backend" / ".env.example").exists():
        text = (ROOT / "backend" / ".env.example").read_text(encoding="utf-8")
    else:
        text = ""

    if re.search(r"^DATABASE_URL=.*$", text, flags=re.MULTILINE):
        text = re.sub(r"^DATABASE_URL=.*$", f"DATABASE_URL={database_url}", text, flags=re.MULTILINE)
    else:
        text += f"\nDATABASE_URL={database_url}\n"
    env_path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Запустить встроенный PostgreSQL для разработки")
    parser.add_argument("--pgdata", type=Path, default=DEFAULT_PGDATA, help="каталог данных PostgreSQL")
    parser.add_argument("--env", type=Path, default=DEFAULT_ENV, help="куда записать DATABASE_URL")
    args = parser.parse_args()

    args.pgdata.mkdir(parents=True, exist_ok=True)
    server = pgserver.get_server(args.pgdata, cleanup_mode=None)
    base_uri = server.get_uri()

    try:
        server.psql("CREATE DATABASE hero_typing;")
    except Exception as error:  # noqa: BLE001 — база уже существует
        if "already exists" not in str(error):
            print(f"Не удалось создать базу: {error}")

    database_url = re.sub(r"/[^/]+$", "/hero_typing", base_uri)
    update_env(args.env, database_url)

    print("PostgreSQL запущен.")
    print(f"  DATABASE_URL={database_url}")
    print(f"  Записано в {args.env}")
    print("  Остановить сервер: pg_ctl -D .pgdata stop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
