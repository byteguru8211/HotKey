"""Точка входа: API + собранный React-фронтенд на одном порту."""

from __future__ import annotations

import os

from app import create_app

app = create_app()


def main() -> None:
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "0") in {"1", "true", "True"}
    banner = f"Печать героя -> http://{host}:{port}"

    if debug:
        app.run(host=host, port=port, debug=True)
        return

    from waitress import serve

    print(banner, flush=True)
    serve(app, host=host, port=port, threads=8)


if __name__ == "__main__":
    main()
