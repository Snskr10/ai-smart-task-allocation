from datetime import datetime, timezone

from config import (
    DEADLINE_NEAR_DAYS,
    LOW_PROGRESS_THRESHOLD,
    STALE_DAYS,
    STUCK_STAGE_DAYS,
)
from datetime_utils import days_between, parse_iso


def compute_silent_failures(db, now=None):
    if now is None:
        now = datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    employees = {e["id"]: e for e in db["employees"]}
    out = []
    for task in db["tasks"]:
        if task.get("status") == "Done" or not task.get("assignedTo"):
            continue
        emp = employees.get(task["assignedTo"])
        if not emp:
            continue
        last_up = parse_iso(task.get("lastProgressUpdate") or task["lastUpdated"])
        status_since = parse_iso(task.get("statusSince") or task["lastUpdated"])
        deadline = parse_iso(task["deadline"])

        days_since_update = days_between(last_up, now)
        days_in_stage = days_between(status_since, now)
        days_to_deadline = days_between(now, deadline)
        reasons = []
        severity = "low"
        if days_since_update >= STALE_DAYS:
            reasons.append(f"No progress update for {int(days_since_update)} days")
            severity = "high" if days_since_update >= 7 else "medium"
        if (
            days_to_deadline <= DEADLINE_NEAR_DAYS
            and days_to_deadline >= 0
            and task.get("progress", 0) < LOW_PROGRESS_THRESHOLD
        ):
            reasons.append("Deadline approaching with low progress")
            severity = "high"
        if deadline < now and task.get("status") != "Done":
            reasons.append("Past deadline")
            severity = "high"
        if days_in_stage >= STUCK_STAGE_DAYS and task.get("status") != "Done":
            reasons.append(f"Stuck in {task['status']} for {int(days_in_stage)} days")
            if severity == "low":
                severity = "medium"
            if days_in_stage >= 10:
                severity = "high"
        if not reasons:
            continue
        sev_order = {"high": 0, "medium": 1, "low": 2}
        out.append(
            {
                "id": f"sf-{task['id']}",
                "taskId": task["id"],
                "employeeId": task["assignedTo"],
                "type": "silent_failure",
                "severity": severity,
                "message": "; ".join(reasons),
                "reason": reasons[0],
                "employeeName": emp["name"],
                "taskName": task["title"],
                "lastUpdate": task.get("lastProgressUpdate") or task["lastUpdated"],
                "riskLevel": "High"
                if severity == "high"
                else ("Medium" if severity == "medium" else "Low"),
            }
        )
    out.sort(key=lambda x: sev_order.get(x["severity"], 9))
    return out
