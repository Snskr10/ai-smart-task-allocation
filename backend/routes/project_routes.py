from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from config import MAX_SUGGESTED_ACTIVE
from database import read_db, write_db
from services.employees import active_task_count, employee_name_map
from services.project_planner import plan_project
from services.projects import list_projects, normalize_project
from services.task_utils import next_task_id

bp = Blueprint("projects_api", __name__)


@bp.get("/projects")
def projects_list():
    return jsonify(list_projects(read_db()))


@bp.post("/projects/plan")
def plan():
    db = read_db()
    body = request.get_json(silent=True) or {}
    if not body.get("title") or not body.get("description"):
        return jsonify({"error": "title and description are required"}), 400
    return jsonify(plan_project(db, body))


@bp.post("/projects/create-all")
def create_all():
    db = read_db()
    body = request.get_json(silent=True) or {}
    tasks_input = body.get("tasks")
    if not isinstance(tasks_input, list) or not tasks_input:
        return jsonify({"error": "tasks array is required"}), 400

    default_project = normalize_project(body.get("project"))

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    created = []
    errors = []

    for item in tasks_input:
        assigned_to = item.get("assignedTo") or None
        if assigned_to and not any(e["id"] == assigned_to for e in db["employees"]):
            errors.append({"title": item.get("title", "?"), "error": "Invalid assignee"})
            continue

        if assigned_to:
            at = active_task_count(db["tasks"], assigned_to)
            if at >= MAX_SUGGESTED_ACTIVE:
                errors.append({"title": item.get("title", "?"),
                               "error": f"{assigned_to} is at capacity ({at} active tasks)"})
                continue

        rs = item.get("requiredSkills")
        if not isinstance(rs, list):
            rs = []

        task_project = normalize_project(item.get("project")) or default_project

        task = {
            "id": next_task_id(db["tasks"]),
            "title": item.get("title") or "Untitled",
            "description": item.get("description") or "",
            "requiredSkills": rs,
            "assignedTo": assigned_to,
            "deadline": item.get("deadline") or now_iso,
            "priority": item.get("priority") or "Medium",
            "status": "To Do",
            "progress": 0,
            "lastUpdated": now_iso,
            "lastProgressUpdate": now_iso,
            "statusSince": now_iso,
            "comments": [],
            "project": task_project,
        }
        db["tasks"].append(task)
        created.append(task)

    if created:
        write_db(db)

    em = employee_name_map(db)
    enriched = []
    for t in created:
        row = dict(t)
        row["assignedEmployeeName"] = em.get(t["assignedTo"]) if t.get("assignedTo") else None
        enriched.append(row)

    return jsonify({"created": enriched, "errors": errors}), 201
