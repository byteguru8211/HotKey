"""Доменные модели приложения «Печать героя»."""

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db
from .timeutil import local_today, utcnow


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(32), nullable=False)
    username_key = db.Column(db.String(32), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_demo = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    last_practice_date = db.Column(db.Date)

    xp = db.Column(db.Integer, default=0, nullable=False)
    level = db.Column(db.Integer, default=1, nullable=False)

    best_cpm = db.Column(db.Float, default=0.0, nullable=False)
    best_wpm = db.Column(db.Float, default=0.0, nullable=False)
    best_accuracy = db.Column(db.Float, default=0.0, nullable=False)
    best_combo = db.Column(db.Integer, default=0, nullable=False)

    total_sessions = db.Column(db.Integer, default=0, nullable=False)
    total_chars = db.Column(db.Integer, default=0, nullable=False)
    total_errors = db.Column(db.Integer, default=0, nullable=False)
    total_seconds = db.Column(db.Integer, default=0, nullable=False)

    streak_days = db.Column(db.Integer, default=0, nullable=False)
    longest_streak = db.Column(db.Integer, default=0, nullable=False)

    sound_enabled = db.Column(db.Boolean, default=True, nullable=False)
    effects_enabled = db.Column(db.Boolean, default=True, nullable=False)
    preferred_language = db.Column(db.String(2), default="ru", nullable=False)

    sessions = db.relationship(
        "TypingSession", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    achievements = db.relationship(
        "UserAchievement", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    char_stats = db.relationship(
        "UserCharStat", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )

    # --- пароль -----------------------------------------------------------
    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    # --- прогресс ---------------------------------------------------------
    def touch_streak(self) -> None:
        today = local_today()
        if self.last_practice_date == today:
            return
        if self.last_practice_date is not None:
            delta = (today - self.last_practice_date).days
            self.streak_days = self.streak_days + 1 if delta == 1 else 1
        else:
            self.streak_days = 1
        self.longest_streak = max(self.longest_streak or 0, self.streak_days or 0)
        self.last_practice_date = today

    def as_dict(self) -> dict:
        from .scoring import level_progress, rank_for_level, unlocked_content

        progress = level_progress(self.xp)
        unlocks = unlocked_content(self.level)
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "level": progress["level"],
            "rank": rank_for_level(progress["level"]),
            "xp": self.xp,
            "xp_progress": progress,
            "unlocks": unlocks,
            "best_cpm": round(self.best_cpm or 0, 1),
            "best_wpm": round(self.best_wpm or 0, 1),
            "best_accuracy": round(self.best_accuracy or 0, 2),
            "best_combo": self.best_combo or 0,
            "streak_days": self.streak_days or 0,
            "longest_streak": self.longest_streak or 0,
            "total_sessions": self.total_sessions or 0,
            "total_chars": self.total_chars or 0,
            "total_seconds": self.total_seconds or 0,
            "sound_enabled": self.sound_enabled,
            "effects_enabled": self.effects_enabled,
            "preferred_language": self.preferred_language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TypingSession(db.Model):
    __tablename__ = "typing_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    mode = db.Column(db.String(16), nullable=False)
    language = db.Column(db.String(2), nullable=False)
    difficulty = db.Column(db.String(16), nullable=False)
    variant = db.Column(db.String(16))
    is_night = db.Column(db.Boolean, default=False, nullable=False)

    duration_sec = db.Column(db.Integer, nullable=False)
    correct_chars = db.Column(db.Integer, nullable=False)
    errors = db.Column(db.Integer, nullable=False)
    typed_chars = db.Column(db.Integer, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    cpm = db.Column(db.Float, nullable=False)
    wpm = db.Column(db.Float, nullable=False)
    max_combo = db.Column(db.Integer, nullable=False)
    bonus_count = db.Column(db.Integer, default=0, nullable=False)
    xp_earned = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    user = db.relationship("User", back_populates="sessions")

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "mode": self.mode,
            "language": self.language,
            "difficulty": self.difficulty,
            "variant": self.variant,
            "duration_sec": self.duration_sec,
            "correct_chars": self.correct_chars,
            "errors": self.errors,
            "typed_chars": self.typed_chars,
            "accuracy": round(self.accuracy, 2),
            "cpm": round(self.cpm, 1),
            "wpm": round(self.wpm, 1),
            "max_combo": self.max_combo,
            "bonus_count": self.bonus_count,
            "xp_earned": self.xp_earned,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class UserAchievement(db.Model):
    __tablename__ = "user_achievements"
    __table_args__ = (db.UniqueConstraint("user_id", "code", name="uq_user_achievement"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = db.Column(db.String(48), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship("User", back_populates="achievements")


class UserCharStat(db.Model):
    """Агрегированная точность по каждому символу — основа детального разбора."""

    __tablename__ = "user_char_stats"
    __table_args__ = (db.UniqueConstraint("user_id", "symbol", name="uq_user_char"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = db.Column(db.String(12), nullable=False)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    errors = db.Column(db.Integer, default=0, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = db.relationship("User", back_populates="char_stats")
