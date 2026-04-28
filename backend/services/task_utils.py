import re
from datetime import datetime, timezone


def next_task_id(tasks):
    nums = []
    for t in tasks:
        m = re.search(r"(\d+)", str(t.get("id", "")))
        if m:
            nums.append(int(m.group(1)))
    m = max(nums) if nums else 0
    return f"task-{m + 1}"


def serialize_tasks_with_names(tasks, em):
    out = []
    for t in tasks:
        row = dict(t)
        aid = t.get("assignedTo")
        row["assignedEmployeeName"] = em.get(aid) if aid else None
        out.append(row)
    return out


def delete_task(db, task_id):
    original_len = len(db["tasks"])
    db["tasks"] = [t for t in db["tasks"] if t["id"] != task_id]
    return len(db["tasks"]) < original_len


def reassign_task(db, task_id, new_employee_id):
    task = next((t for t in db["tasks"] if t["id"] == task_id), None)
    if task is None:
        return None, "Task not found"
    if not any(e["id"] == new_employee_id for e in db["employees"]):
        return None, "Invalid employee"
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    task["assignedTo"] = new_employee_id
    task["statusSince"] = now_iso
    task["lastUpdated"] = now_iso
    return task, None
