"""Контент тренажёра: словари, фразы, фрагменты кода и генерация текста."""

from __future__ import annotations

import random

RU_WORDS = """
дом кот лес река окно стол город книга время слово рука нога голова глаз дверь свет
день ночь утро вечер зима весна лето осень небо солнце луна звезда ветер дождь снег
огонь вода земля трава дерево цветок птица рыба зверь волк лиса медведь заяц конь
корова кошка собака мышь поле дорога мост поезд машина самолёт корабль остров берег
гора холм тропа песок камень облако гроза радуга иней мороз жара прохлада воздух
работа дело идея проект задача ответ вопрос пример число буква текст строка экран
клавиша палец ладонь ритм темп скорость точность победа рекорд цель путь шаг старт
финиш команда система программа компьютер интернет музыка песня голос кино театр
праздник подарок дружба семья мама папа брат сестра бабушка дедушка ребёнок человек
герой мастер ученик учитель школа урок знание память разум сердце душа характер воля
сила ловкость привычка практика прогресс уровень опыт бонус комбо очки награда
успех удача случай выбор решение план совет помощь поддержка развитие движение
скорость полёт прыжок круг линия точка знак символ код файл окно сеть сервер клиент
данные запрос таблица запись ключ архив проект версия сборка тест отладка модуль
функция объект класс метод массив список стек очередь индекс путь логика цикл
"""

EN_WORDS = """
home cat forest river window table city book time word hand foot head eye door light
day night morning evening winter spring summer autumn sky sun moon star wind rain snow
fire water earth grass tree flower bird fish animal wolf fox bear rabbit horse cow cat
dog mouse field road bridge train car plane ship island coast mountain hill trail sand
stone cloud storm rainbow frost cold heat shade air work case idea project task answer
question example number letter text line screen key finger palm rhythm tempo speed
accuracy victory record goal path step start finish team system program computer internet
music song voice movie theater holiday gift friendship family mother father brother sister
child person hero master student teacher school lesson knowledge memory mind heart soul
character will power agility habit practice progress level experience bonus combo points
reward success luck chance choice decision plan advice help support growth movement
flight jump circle line dot sign symbol code file network server client data request
table record key archive version build test debug module function object class method
array list stack queue index logic loop
"""

RU_SENTENCES = [
    "Утро начинается с чашки крепкого кофе и тишины.",
    "Хорошая идея приходит, когда меньше всего её ждёшь.",
    "Скорость приходит с практикой, а точность с вниманием.",
    "Мы печатаем вслепую: глаза смотрят на текст, а пальцы знают дорогу.",
    "Каждый день по десять минут, и через месяц результат заметен.",
    "Настоящий мастер не спешит, но и не останавливается.",
    "Ветер стих, и на небе показались первые звёзды.",
    "В библиотеке пахло старыми книгами и свежим кофе.",
    "Он открыл ноутбук, вдохнул и начал печатать первую строку.",
    "Тренировка это не наказание, а маленькая победа над собой.",
    "Ошибки не страшны: они показывают, куда двигаться дальше.",
    "Река медленно несла листья мимо старого деревянного моста.",
    "Тот, кто умеет ждать, получает больше, чем тот, кто торопится.",
    "Спокойный ритм важнее рывка: так печать остаётся ровной.",
    "Сегодня отличный день, чтобы побить свой прошлый рекорд.",
    "Тишина в комнате нарушалась только стуком клавиш.",
    "Сначала медленно и правильно, потом быстро и уверенно.",
    "Лучший способ научиться делать это каждый день.",
    "Правило простое: сначала точность, затем скорость.",
    "Он посмотрел на экран, улыбнулся и нажал Enter.",
    "Вдох, выдох, пауза, ещё одна строка.",
    "За окном шёл дождь, а в комнате горела настольная лампа.",
    "Маленькие шаги каждый день дают больший результат, чем редкие рывки.",
    "Клавиатура запоминает не слова, а движение ваших пальцев.",
]

EN_SENTENCES = [
    "The morning starts with a cup of strong coffee and silence.",
    "A good idea arrives when you least expect it.",
    "Speed comes with practice, and accuracy comes with attention.",
    "We type blind: the eyes read the text, the fingers know the way.",
    "Ten minutes every day, and in a month the result is visible.",
    "A true master does not rush, but never stops either.",
    "The wind calmed down and the first stars appeared in the sky.",
    "The library smelled of old books and fresh coffee.",
    "He opened the laptop, took a breath and typed the first line.",
    "Practice is not a punishment, it is a small victory over yourself.",
    "Mistakes are not scary: they show where to move next.",
    "The river carried leaves past the old wooden bridge.",
    "Slow and correct first, then fast and confident.",
    "The best way to learn is to do it every single day.",
    "The rule is simple: accuracy first, speed second.",
    "She looked at the screen, smiled and pressed Enter.",
    "Rain was falling outside while a desk lamp lit the room.",
    "Small steps every day beat rare bursts of effort.",
    "Your keyboard remembers movements, not words.",
    "A calm rhythm matters more than a sudden sprint.",
    "Breathe in, breathe out, pause, one more line.",
    "The city lights reflected in the dark river water.",
    "He kept a notebook of ideas and reviewed it every Friday.",
    "Type with your fingertips and keep your wrists relaxed.",
]

CODE_SNIPPETS = {
    "python": [
        {
            "title": "Приветствие",
            "tier": 1,
            "code": 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("hero"))',
        },
        {
            "title": "Сумма списка",
            "tier": 2,
            "code": (
                "def total(prices):\n"
                "    result = 0\n"
                "    for price in prices:\n"
                "        result += price\n"
                "    return result\n\n"
                "print(total([120, 340, 99]))"
            ),
        },
        {
            "title": "Класс и свойства",
            "tier": 3,
            "code": (
                "class Hero:\n"
                "    def __init__(self, name, level=1):\n"
                "        self.name = name\n"
                "        self.level = level\n\n"
                "    def power(self):\n"
                "        return self.level * 42\n\n"
                "hero = Hero(\"Nova\", 7)\n"
                "print(hero.name, hero.power())"
            ),
        },
    ],
    "javascript": [
        {
            "title": "Функция и шаблон",
            "tier": 1,
            "code": 'const greet = (name) => `Hello, ${name}!`;\n\nconsole.log(greet("hero"));',
        },
        {
            "title": "Массив объектов",
            "tier": 2,
            "code": (
                "const scores = [120, 340, 99];\n"
                "const total = scores.reduce((sum, value) => sum + value, 0);\n\n"
                "console.log(`Total: ${total}`);"
            ),
        },
        {
            "title": "Асинхронный запрос",
            "tier": 3,
            "code": (
                "async function loadHero(id) {\n"
                "  const response = await fetch(`/api/heroes/${id}`);\n"
                "  if (!response.ok) {\n"
                "    throw new Error(`Request failed: ${response.status}`);\n"
                "  }\n"
                "  return response.json();\n"
                "}"
            ),
        },
    ],
    "html": [
        {
            "title": "Карточка",
            "tier": 1,
            "code": '<section class="card">\n  <h2>Hero</h2>\n  <p>Level 7 typist</p>\n</section>',
        },
        {
            "title": "Навигация",
            "tier": 2,
            "code": (
                '<nav class="menu">\n'
                "  <a href=\"/\">Home</a>\n"
                '  <a href="/stats">Stats</a>\n'
                '  <a href="/leaders">Leaders</a>\n'
                "</nav>"
            ),
        },
        {
            "title": "Форма",
            "tier": 3,
            "code": (
                '<form class="login" action="/api/login" method="post">\n'
                '  <label for="email">Email</label>\n'
                '  <input id="email" name="email" type="email" required>\n'
                '  <button type="submit">Sign in</button>\n'
                "</form>"
            ),
        },
    ],
    "css": [
        {
            "title": "Кнопка",
            "tier": 1,
            "code": ".button {\n  padding: 12px 24px;\n  border-radius: 999px;\n  background: #ffb547;\n}",
        },
        {
            "title": "Сетка карточек",
            "tier": 2,
            "code": (
                ".grid {\n"
                "  display: grid;\n"
                "  grid-template-columns: repeat(3, 1fr);\n"
                "  gap: 24px;\n"
                "}"
            ),
        },
        {
            "title": "Анимация появления",
            "tier": 3,
            "code": (
                "@keyframes rise {\n"
                "  from { opacity: 0; transform: translateY(12px); }\n"
                "  to { opacity: 1; transform: translateY(0); }\n"
                "}\n\n"
                ".card {\n"
                "  animation: rise 400ms ease-out both;\n"
                "}"
            ),
        },
    ],
}

CODE_LANGUAGES = {
    "python": {"title": "Python", "monogram": "Py"},
    "javascript": {"title": "JavaScript", "monogram": "JS"},
    "html": {"title": "HTML", "monogram": "<>"},
    "css": {"title": "CSS", "monogram": "#"},
}

SYMBOLS_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:,.<>/?|~"

TIER_BY_DIFFICULTY = {"easy": 1, "normal": 2, "hard": 2, "expert": 3}

WORD_COUNT = {"easy": 24, "normal": 30, "hard": 26, "expert": 22}
SENTENCE_COUNT = {"easy": 2, "normal": 3, "hard": 4, "expert": 5}
SYMBOL_GROUPS = {"easy": 28, "normal": 34, "hard": 32, "expert": 30}


def _words(language: str) -> list[str]:
    source = RU_WORDS if language == "ru" else EN_WORDS
    words = sorted({w.lower() for w in source.split() if 2 <= len(w) <= 10})
    return words


def _pick_sentences(language: str, count: int, rng: random.Random) -> list[str]:
    pool = list(RU_SENTENCES if language == "ru" else EN_SENTENCES)
    rng.shuffle(pool)
    return pool[:count]


def _generate_words(language: str, difficulty: str, rng: random.Random) -> tuple[str, dict]:
    words = _words(language)
    if difficulty == "easy":
        pool = [w for w in words if len(w) <= 5]
    elif difficulty == "normal":
        pool = [w for w in words if len(w) <= 7]
    else:
        pool = [w for w in words if len(w) >= 5]
    if not pool:
        pool = words

    count = WORD_COUNT[difficulty]
    chosen: list[str] = []
    previous = None
    while len(chosen) < count:
        word = rng.choice(pool)
        if word != previous:
            chosen.append(word)
            previous = word
    return " ".join(chosen), {"words": len(chosen)}


def _generate_code(variant: str, difficulty: str, rng: random.Random) -> tuple[str, dict]:
    variant = variant if variant in CODE_SNIPPETS else "python"
    tier = TIER_BY_DIFFICULTY[difficulty]
    snippets = [s for s in CODE_SNIPPETS[variant] if s["tier"] <= tier] or CODE_SNIPPETS[variant]
    snippet = rng.choice(snippets)
    return snippet["code"], {"title": snippet["title"], "variant": variant}


def _generate_symbols(language: str, difficulty: str, rng: random.Random) -> tuple[str, dict]:
    if language == "ru":
        letters = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
        # На русской раскладке часть ASCII-символов недоступна: @ # $ & < > | ~ и т. п.
        typable = "!\"№;%:?*()_+-=.,/\\[]{}"
        alphabets = {
            "easy": "0123456789" + letters + "._-+",
            "normal": "0123456789" + letters.upper() + "!\"№;%:?*()_+-=",
            "hard": "0123456789" + letters.upper() + letters + typable,
            "expert": "0123456789" + letters.upper() + letters + typable,
        }
        sizes = {"easy": 4, "normal": 5, "hard": 6, "expert": 7}
    else:
        letters = "abcdefghijklmnopqrstuvwxyz"
        alphabets = {
            "easy": "0123456789" + letters + "._-+",
            "normal": "0123456789" + letters.upper() + "!@#$%&*()_+-=:;",
            "hard": "0123456789" + letters.upper() + letters + "!@#$%^&*()_+-=[]{};:,.<>/?",
            "expert": SYMBOLS_POOL,
        }
        sizes = {"easy": 4, "normal": 5, "hard": 6, "expert": 7}

    alphabet = alphabets.get(difficulty, alphabets["normal"])
    size = sizes.get(difficulty, 5)
    groups = []
    for _ in range(SYMBOL_GROUPS[difficulty]):
        groups.append("".join(rng.choice(alphabet) for _ in range(rng.randint(size - 1, size))))
    return " ".join(groups), {"groups": len(groups)}


def generate_text(
    mode: str,
    language: str,
    difficulty: str,
    variant: str = "python",
    duration: int = 60,
    seed=None,
) -> dict:
    """Возвращает текст упражнения и служебные метаданные.

    Объём текста масштабируется под выбранную длительность, чтобы даже очень
    быстрый печатник не упёрся в конец упражнения раньше времени.
    """
    rng = random.Random(seed) if seed is not None else random.Random()
    language = language if language in ("ru", "en") else "ru"
    difficulty = difficulty if difficulty in WORD_COUNT else "normal"
    mode = mode if mode in ("words", "sentences", "symbols", "code") else "words"
    duration = max(15, min(int(duration or 60), 300))

    if mode == "words":
        text, meta = _generate_words(language, difficulty, rng)
        target_words = max(WORD_COUNT[difficulty], int(duration * 1.05))
        if target_words > meta["words"]:
            extras, extra_meta = _generate_words(language, difficulty, rng)
            text = text + " " + extras
            # дозаполняем до нужного объёма, если текста всё ещё мало
            guard = 0
            while len(text) < duration * 8 and guard < 12:
                more, _ = _generate_words(language, difficulty, rng)
                text += " " + more
                guard += 1
            meta["words"] = len(text.split())
    elif mode == "sentences":
        needed = max(SENTENCE_COUNT[difficulty], int(duration / 16) + 1)
        sentences: list[str] = []
        guard = 0
        while len(" ".join(sentences)) < duration * 7 and guard < 40:
            batch = _pick_sentences(language, needed, rng)
            sentences.extend(batch)
            guard += 1
        text = " ".join(sentences)
        if difficulty == "expert":
            text = text.replace(".", " 2026.", 1)
        meta = {"sentences": len(sentences)}
    elif mode == "symbols":
        text, meta = _generate_symbols(language, difficulty, rng)
        guard = 0
        while len(text) < duration * 8 and guard < 40:
            more, _ = _generate_symbols(language, difficulty, rng)
            text += " " + more
            guard += 1
        meta["groups"] = len(text.split())
    else:
        text, meta = _generate_code(variant, difficulty, rng)
        # Для длинных заходов склеиваем несколько фрагментов подряд.
        guard = 0
        while len(text) < duration * 5 and guard < 4:
            extra, _ = _generate_code(variant, difficulty, rng)
            text = text + "\n\n" + extra
            guard += 1
        meta["variant"] = variant

    return {
        "text": text,
        "mode": mode,
        "language": language,
        "difficulty": difficulty,
        "variant": variant if mode == "code" else None,
        "duration": duration,
        "length": len(text),
        "meta": meta,
    }

