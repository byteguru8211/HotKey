"""Единый формат ответов и ошибок API."""

from __future__ import annotations

from flask import jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    status = 400
    code = "bad_request"

    def __init__(self, message: str, *, status: int | None = None, code: str | None = None, fields=None):
        super().__init__(message)
        self.message = message
        self.status = status or self.status
        self.code = code or self.code
        self.fields = fields or {}

    def to_dict(self) -> dict:
        payload = {"code": self.code, "message": self.message}
        if self.fields:
            payload["fields"] = self.fields
        return payload


def ok(data=None, status: int = 200):
    return jsonify({"ok": True, "data": data}), status


def fail(message: str, *, status: int = 400, code: str = "bad_request", fields=None):
    return (
        jsonify({"ok": False, "error": {"code": code, "message": message, "fields": fields or {}}}),
        status,
    )


def register_error_handlers(app) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return fail(error.message, status=error.status, code=error.code, fields=error.fields)

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return fail(error.description or "Ошибка запроса", status=error.code or 500, code="http_error")

    @app.errorhandler(Exception)
    def handle_unexpected(error: Exception):
        app.logger.exception("Unhandled error: %s", error)
        return fail("Внутренняя ошибка сервера", status=500, code="internal_error")
