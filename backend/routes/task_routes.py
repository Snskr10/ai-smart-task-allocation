from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from config import MAX_SUGGESTED_ACTIVE
from database import read_db, write_db
from services.assignment import build_assign_ai_response
from services.employees import active_task_count, employee_name_map
from services.projects import normalize_project
from services.task_utils import delete_task, next_task_id, reassign_task, serialize_tasks_with_names

bp = Blueprint("tasks_api", __name__)


@bp.get("/tasks")
def tasks():
    db = read_db()
    em = employee_name_map(db)
    return jsonify(serialize_tasks_with_names(db["tasks"], em))


@bp.get("/tasks/employee/<employee_id>")
def tasks_employee(employee_id):
    db = read_db()
    em = employee_name_map(db)
    filtered = [t for t in db["tasks"] if t.get("assignedTo") == employee_id]
    return jsonify(serialize_tasks_with_names(filtered, em))


@bp.post("/tasks")
def create_task():
    db = read_db()
    body = request.get_json(silent=True) or {}
    title = body.get("title")
    deadline = body.get("deadline")
    if not title or not deadline:
        return jsonify({"error": "title and deadline required"}), 400
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    rs = body.get("requiredSkills")
    if not isinstance(rs, list):
        rs = []
    assigned_to = body.get("assignedTo") or None
    task = {
        "id": next_task_id(db["tasks"]),
        "title": title,
        "description": body.get("description") or "",
        "requiredSkills": rs,
        "assignedTo": assigned_to,
        "deadline": deadline,
        "priority": body.get("priority") or "Medium",
        "status": body.get("status") or "To Do",
        "progress": body["progress"] if isinstance(body.get("progress"), int) else 0,
        "lastUpdated": now_iso,
        "lastProgressUpdate": now_iso,
        "statusSince": now_iso,
        "comments": [],
        "project": normalize_project(body.get("project")),
    }
    if assigned_to:
        if not any(e["id"] == assigned_to for e in db["employees"]):
            return jsonify({"error": "Invalid assignee"}), 400
        at = active_task_count(db["tasks"], assigned_to)
        if at >= MAX_SUGGESTED_ACTIVE:
            others = [
                e
                for e in db["employees"]
                if active_task_count(db["tasks"], e["id"]) < MAX_SUGGESTED_ACTIVE
            ]
            if others:
                return (
                    jsonify(
                        {
                            "error": "Assignee at capacity",
                            "hint": "Pick another employee with lower active load",
                            "alternatives": [e["id"] for e in others],
                        }
                    ),
                    409,
                )
    db["tasks"].append(task)
    write_db(db)
    em = employee_name_map(db)
    row = dict(task)
    row["assignedEmployeeName"] = em.get(assigned_to) if assigned_to else None
    return jsonify(row), 201


@bp.post("/tasks/assign-ai")
def assign_ai():
    db = read_db()
    body = request.get_json(silent=True) or {}
    return jsonify(build_assign_ai_response(db, body))


@bp.delete("/tasks/<task_id>")
def delete_task_route(task_id):
    db = read_db()
    removed = delete_task(db, task_id)
    if not removed:
        return jsonify({"error": "Not found"}), 404
    write_db(db)
    return "", 204


@bp.put("/tasks/<task_id>/reassign")
def reassign_task_route(task_id):
    db = read_db()
    body = request.get_json(silent=True) or {}
    new_employee_id = body.get("assignedTo")
    if not new_employee_id:
        return jsonify({"error": "assignedTo is required"}), 400
    task, err = reassign_task(db, task_id, new_employee_id)
    if err:
        return jsonify({"error": err}), 404 if err == "Task not found" else 400
    write_db(db)
    em = employee_name_map(db)
    row = dict(task)
    row["assignedEmployeeName"] = em.get(new_employee_id)
    return jsonify(row)


@bp.put("/tasks/<task_id>/progress")
def task_progress(task_id):
    db = read_db()
    task = next((t for t in db["tasks"] if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(silent=True) or {}
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    if isinstance(body.get("progress"), int):
        task["progress"] = max(0, min(100, body["progress"]))
    status = body.get("status")
    allowed = {"To Do", "In Progress", "Testing", "Done"}
    if status:
        if status not in allowed:
            return jsonify({"error": "Invalid status"}), 400
        if task.get("status") != status:
            task["status"] = status
            task["statusSince"] = now_iso
    comment = body.get("comment")
    if comment and str(comment).strip():
        task.setdefault("comments", []).append(
            {
                "text": str(comment).strip(),
                "at": now_iso,
                "authorId": body.get("authorId"),
            }
        )
    # Task dependencies
    deps = body.get("dependencies")
    if isinstance(deps, list):
        valid_ids = {t["id"] for t in db["tasks"]}
        task["dependencies"] = [d for d in deps if isinstance(d, str) and d in valid_ids and d != task_id]
    task["lastProgressUpdate"] = now_iso
    task["lastUpdated"] = now_iso
    write_db(db)
    em = employee_name_map(db)
    row = dict(task)
    row["assignedEmployeeName"] = em.get(task["assignedTo"]) if task.get("assignedTo") else None
    return jsonify(row)
