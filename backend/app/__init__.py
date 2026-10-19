"""Фабрика Flask-приложения «Печать героя»."""

from __future__ import annotations

import os

from flask import Flask, abort, jsonify, send_from_directory
from flask_cors import CORS

from .config import FRONTEND_DIST, Config
from .database import init_database
from .errors import register_error_handlers


def create_app(config_object=Config) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_object)
    app.json.ensure_ascii = False
    app.url_map.strict_slashes = False

    origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins or "*"}})

    init_database(app)

    from .routes.achievements import bp as achievements_bp
    from .routes.auth import bp as auth_bp
    from .routes.leaderboard import bp as leaderboard_bp
    from .routes.practice import bp as practice_bp
    from .routes.profile import bp as profile_bp
    from .routes.stats import bp as stats_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(practice_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(leaderboard_bp)
    app.register_blueprint(achievements_bp)

    register_error_handlers(app)

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "ok": True,
                "data": {
                    "status": "ok",
                    "database": app.config.get("DATABASE_KIND", "unknown"),
                    "app": "Печать героя",
                    "api": "v1",
                },
            }
        )

    _register_frontend(app)
    _register_cli(app)
    return app


def _register_frontend(app: Flask) -> None:
    index_file = FRONTEND_DIST / "index.html"

    @app.get("/")
    def index():
        if index_file.exists():
            return send_from_directory(FRONTEND_DIST, "index.html")
        return jsonify(
            {
                "ok": True,
                "data": {
                    "message": "API «Печать героя» работает. Соберите фронтенд: cd frontend && npm run build",
                    "api": "/api/health",
                },
            }
        )

    @app.get("/<path:path>")
    def spa(path: str):
        if path.startswith("api/"):
            abort(404)
        candidate = FRONTEND_DIST / path
        if candidate.is_file():
            return send_from_directory(FRONTEND_DIST, path)
        if index_file.exists():
            return send_from_directory(FRONTEND_DIST, "index.html")
        abort(404)


def _register_cli(app: Flask) -> None:
    import click

    @app.cli.command("init-db")
    def init_db_command():
        """Создаёт таблицы в настроенной базе данных."""
        from .extensions import db

        db.create_all()
        click.echo("Схема базы данных готова.")

    @app.cli.command("seed-demo")
    def seed_demo_command():
        """Добавляет демонстрационных игроков в таблицу лидеров."""
        from .seed import seed_demo_data

        seed_demo_data()
        click.echo("Демо-данные загружены.")
