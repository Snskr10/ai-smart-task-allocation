from datetime import datetime, timezone

from datetime_utils import parse_iso

from .alerts import compute_silent_failures
from .employees import enrich_employees


def build_manager_dashboard(db):
    failures = compute_silent_failures(db)
    now = datetime.now(timezone.utc)
    delayed = []
    for t in db["tasks"]:
        if t.get("status") == "Done":
            continue
        dl = parse_iso(t["deadline"])
        if dl < now:
            delayed.append(t)
    active = [t for t in db["tasks"] if t.get("status") != "Done"]
    return {
        "totalEmployees": len(db["employees"]),
        "totalTasks": len(db["tasks"]),
        "activeTasks": len(active),
        "delayedTasks": len(delayed),
        "silentFailureAlerts": len(failures),
        "workload": enrich_employees(db),
    }
