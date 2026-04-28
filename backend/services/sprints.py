import re
from datetime import datetime, timezone, timedelta

from datetime_utils import parse_iso, days_between


def list_sprints(db):
    sprints = db.get("sprints", [])
    tasks = db.get("tasks", [])
    result = []
    for s in sprints:
        sprint_tasks = [t for t in tasks if t.get("sprintId") == s["id"]]
        done = sum(1 for t in sprint_tasks if t.get("status") == "Done")
        result.append({
            **s,
            "taskCount": len(sprint_tasks),
            "completedCount": done,
        })
    return sorted(result, key=lambda x: x.get("startDate", ""), reverse=True)


def next_sprint_id(sprints):
    nums = []
    for s in sprints:
        m = re.search(r"(\d+)", str(s.get("id", "")))
        if m:
            nums.append(int(m.group(1)))
    return f"sprint-{(max(nums) if nums else 0) + 1}"


def compute_burndown(db, sprint_id):
    sprint = next((s for s in db.get("sprints", []) if s["id"] == sprint_id), None)
    if not sprint:
        return None
    tasks = [t for t in db.get("tasks", []) if t.get("sprintId") == sprint_id]
    total = len(tasks)
    if total == 0:
        return {"sprint": sprint, "totalTasks": 0, "points": []}

    start = parse_iso(sprint["startDate"])
    end = parse_iso(sprint["endDate"])
    now = datetime.now(timezone.utc)
    span = max(1, days_between(start, end))

    points = []
    for day_offset in range(int(span) + 1):
        day = start + timedelta(days=day_offset)
        ideal = round(total * (1 - day_offset / span), 1)
        if day <= now + timedelta(hours=1):
            done_by_day = sum(
                1 for t in tasks
                if t.get("status") == "Done"
                and parse_iso(t.get("lastUpdated", "")) <= day + timedelta(hours=23, minutes=59)
            )
            points.append({
                "day": day_offset + 1,
                "date": day.strftime("%Y-%m-%d"),
                "remaining": total - done_by_day,
                "ideal": ideal,
            })
        else:
            points.append({
                "day": day_offset + 1,
                "date": day.strftime("%Y-%m-%d"),
                "remaining": None,
                "ideal": ideal,
            })

    return {"sprint": sprint, "totalTasks": total, "points": points}
