from collections import Counter


def list_projects(db):
    c = Counter()
    for t in db["tasks"]:
        p = t.get("project")
        if isinstance(p, str) and p.strip():
            c[p.strip()] += 1
    return [{"name": n, "taskCount": cnt} for n, cnt in sorted(c.items(), key=lambda x: x[0].lower())]


def normalize_project(value):
    if isinstance(value, str):
        s = value.strip()
        return s if s else None
    return None
