from config import WORKLOAD_UNIT


def active_task_count(tasks, employee_id):
    return sum(
        1
        for t in tasks
        if t.get("assignedTo") == employee_id and t.get("status") != "Done"
    )


def workload_percent(tasks, employee_id):
    return min(100, active_task_count(tasks, employee_id) * WORKLOAD_UNIT)


def enrich_employees(db):
    out = []
    for e in db["employees"]:
        at = active_task_count(db["tasks"], e["id"])
        row = dict(e)
        row["activeTasks"] = at
        row["workload"] = workload_percent(db["tasks"], e["id"])
        out.append(row)
    return out


def skill_match_score(required_skills, employee_skills):
    req = [s.lower().strip() for s in (required_skills or []) if s and str(s).strip()]
    if not req:
        return 50.0
    eset = {s.lower() for s in (employee_skills or [])}
    hit = sum(1 for r in req if r in eset)
    return (hit / len(req)) * 100


def employee_name_map(db):
    return {e["id"]: e["name"] for e in db["employees"]}
