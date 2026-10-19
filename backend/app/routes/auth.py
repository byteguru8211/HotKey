"""Регистрация, вход и управление сессией."""

from __future__ import annotations

import re

from flask import Blueprint, request

from ..auth import auth_payload, current_user, login_required
from ..errors import ApiError, ok
from ..extensions import db
from ..models import User
from ..scoring import level_progress
from ..timeutil import local_today

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Zа-яА-Я]{2,}$")
USERNAME_RE = re.compile(r"^[A-Za-zА-Яа-яЁё0-9 _.\-]{2,24}$")


def _validate_registration(payload: dict) -> dict:
    email = str(payload.get("email", "")).strip().lower()
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    fields: dict[str, str] = {}
    if not EMAIL_RE.match(email):
        fields["email"] = "Введите корректный адрес почты"
    if not USERNAME_RE.match(username):
        fields["username"] = "2–24 символа: буквы, цифры, пробел, точка, дефис или _"
    if len(password) < 8:
        fields["password"] = "Пароль должен быть не короче 8 символов"
    if fields:
        raise ApiError("Проверьте поля формы", fields=fields)

    return {"email": email, "username": username, "password": password, "username_key": username.lower()}


@bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    data = _validate_registration(payload)

    if User.query.filter_by(email=data["email"]).first():
        raise ApiError(
            "Аккаунт с такой почтой уже существует",
            status=409,
            code="email_taken",
            fields={"email": "Эта почта уже зарегистрирована"},
        )
    if User.query.filter_by(username_key=data["username_key"]).first():
        raise ApiError(
            "Это имя уже занято",
            status=409,
            code="username_taken",
            fields={"username": "Выберите другое имя"},
        )

    user = User(
        email=data["email"],
        username=data["username"],
        username_key=data["username_key"],
        preferred_language="ru" if payload.get("language", "ru") == "ru" else "en",
        last_practice_date=None,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return ok(auth_payload(user), status=201)


@bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not email or not password:
        raise ApiError("Укажите почту и пароль", fields={"email": "Обязательное поле", "password": "Обязательное поле"})

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        raise ApiError("Неверная почта или пароль", status=401, code="invalid_credentials")

    return ok(auth_payload(user))


@bp.get("/me")
@login_required
def me():
    user = current_user()
    progress = level_progress(user.xp)
    if user.level != progress["level"]:
        user.level = progress["level"]
        db.session.commit()
    data = user.as_dict()
    data["today"] = local_today().isoformat()
    data["level_up_xp"] = progress["xp_to_next"]
    return ok(data)


@bp.post("/password")
@login_required
def change_password():
    payload = request.get_json(silent=True) or {}
    user = current_user()
    current = str(payload.get("current_password", ""))
    new = str(payload.get("new_password", ""))
    fields = {}
    if not user.check_password(current):
        fields["current_password"] = "Текущий пароль не совпадает"
    if len(new) < 8:
        fields["new_password"] = "Новый пароль должен быть не короче 8 символов"
    if fields:
        raise ApiError("Не удалось сменить пароль", fields=fields)
    if current == new:
        raise ApiError("Новый пароль должен отличаться от текущего", fields={"new_password": "Придумайте новый пароль"})

    user.set_password(new)
    db.session.commit()
    return ok({"changed": True})
