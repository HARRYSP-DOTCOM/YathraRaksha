import random
import secrets
import string
import time
from typing import Any

# In-memory challenge store (use Redis in production)
_challenges: dict[str, dict[str, Any]] = {}
CHALLENGE_TTL = 300
MAX_ATTEMPTS = 5

# Exclude ambiguous characters
CHARS = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1IL")


def _purge_expired() -> None:
    now = time.time()
    expired = [cid for cid, data in _challenges.items() if data["expires"] < now]
    for cid in expired:
        del _challenges[cid]


def _random_color() -> str:
    palette = ["#2dd4bf", "#38bdf8", "#fbbf24", "#a78bfa", "#f472b6", "#34d399"]
    return random.choice(palette)


def generate_svg_captcha(text: str) -> str:
    width, height = 280, 100
    noise_lines = []
    for _ in range(8):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        noise_lines.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{_random_color()}" '
            f'stroke-opacity="0.35" stroke-width="{random.randint(1, 2)}"/>'
        )

    dots = []
    for _ in range(40):
        cx, cy = random.randint(0, width), random.randint(0, height)
        dots.append(f'<circle cx="{cx}" cy="{cy}" r="1.2" fill="{_random_color()}" opacity="0.5"/>')

    letters = []
    start_x = 28
    for i, ch in enumerate(text):
        x = start_x + i * 46 + random.randint(-4, 4)
        y = 58 + random.randint(-8, 8)
        rotate = random.randint(-22, 22)
        size = random.randint(30, 36)
        letters.append(
            f'<text x="{x}" y="{y}" fill="{_random_color()}" font-family="Arial,sans-serif" '
            f'font-size="{size}" font-weight="700" transform="rotate({rotate} {x} {y})">{ch}</text>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img">'
        f'<rect width="100%" height="100%" rx="12" fill="#0f172a"/>'
        f'<rect x="2" y="2" width="{width - 4}" height="{height - 4}" rx="10" fill="none" '
        f'stroke="#2dd4bf" stroke-opacity="0.25" stroke-width="2"/>'
        + "".join(noise_lines)
        + "".join(dots)
        + "".join(letters)
        + "</svg>"
    )


def create_challenge() -> dict[str, Any]:
    _purge_expired()
    code = "".join(random.choices(CHARS, k=5))
    challenge_id = secrets.token_urlsafe(18)
    _challenges[challenge_id] = {
        "answer": code.lower(),
        "expires": time.time() + CHALLENGE_TTL,
        "attempts": 0,
    }
    return {
        "challengeId": challenge_id,
        "svg": generate_svg_captcha(code),
        "expiresIn": CHALLENGE_TTL,
        "hint": "Letters are not case-sensitive",
    }


def verify_challenge(challenge_id: str, answer: str) -> tuple[bool, str]:
    _purge_expired()
    data = _challenges.get(challenge_id)
    if not data:
        return False, "Captcha expired. Please refresh and try again."
    if data["expires"] < time.time():
        del _challenges[challenge_id]
        return False, "Captcha expired. Please refresh and try again."

    data["attempts"] += 1
    if data["attempts"] > MAX_ATTEMPTS:
        del _challenges[challenge_id]
        return False, "Too many attempts. Please request a new captcha."

    normalized = (answer or "").strip().lower().replace(" ", "")
    if normalized != data["answer"]:
        remaining = MAX_ATTEMPTS - data["attempts"]
        return False, f"Incorrect code. {remaining} attempt(s) left."

    del _challenges[challenge_id]
    return True, "verified"
