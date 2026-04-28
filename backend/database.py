import json

from config import DATA, DB_PATH, SEED_PATH


def ensure_db():
    DATA.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        DB_PATH.write_text(SEED_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def read_db():
    ensure_db()
    return json.loads(DB_PATH.read_text(encoding="utf-8"))


def write_db(data):
    DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
