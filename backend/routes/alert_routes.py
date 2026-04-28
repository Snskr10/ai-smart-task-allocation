from flask import Blueprint, jsonify

from config import (
    DEADLINE_NEAR_DAYS,
    LOW_PROGRESS_THRESHOLD,
    MAX_SUGGESTED_ACTIVE,
    STALE_DAYS,
    STUCK_STAGE_DAYS,
    WORKLOAD_UNIT,
)
from database import read_db
from services.alerts import compute_silent_failures

bp = Blueprint("alerts_api", __name__)


@bp.get("/alerts/silent-failures")
def silent_failures():
    return jsonify(compute_silent_failures(read_db()))


@bp.get("/config/silent-failure-rules")
def silent_failure_rules():
    return jsonify({
        "staleDays": STALE_DAYS,
        "stuckStageDays": STUCK_STAGE_DAYS,
        "deadlineNearDays": DEADLINE_NEAR_DAYS,
        "lowProgressThreshold": LOW_PROGRESS_THRESHOLD,
        "maxSuggestedActive": MAX_SUGGESTED_ACTIVE,
        "workloadUnit": WORKLOAD_UNIT,
    })
