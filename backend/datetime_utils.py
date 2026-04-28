from datetime import datetime, timezone


def parse_iso(s):
    if not s:
        return datetime.now(timezone.utc)
    s = str(s).replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def days_between(a: datetime, b: datetime) -> float:
    return (b - a).total_seconds() / 86400
