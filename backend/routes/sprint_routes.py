from flask import Blueprint, jsonify, request

from database import read_db, write_db
from services.sprints import compute_burndown, list_sprints, next_sprint_id

bp = Blueprint("sprints_api", __name__)


@bp.get("/sprints")
def get_sprints():
    return jsonify(list_sprints(read_db()))


@bp.post("/sprints")
def create_sprint():
    db = read_db()
    body = request.get_json(silent=True) or {}
    if not body.get("name") or not body.get("startDate") or not body.get("endDate"):
        return jsonify({"error": "name, startDate, and endDate are required"}), 400
    sprint = {
        "id": next_sprint_id(db.get("sprints", [])),
        "name": body["name"].strip(),
        "goal": (body.get("goal") or "").strip(),
        "startDate": body["startDate"],
        "endDate": body["endDate"],
        "status": body.get("status") or "planned",
    }
    db.setdefault("sprints", []).append(sprint)
    write_db(db)
    return jsonify(sprint), 201


@bp.put("/sprints/<sprint_id>")
def update_sprint(sprint_id):
    db = read_db()
    sprint = next((s for s in db.get("sprints", []) if s["id"] == sprint_id), None)
    if not sprint:
        return jsonify({"error": "Sprint not found"}), 404
    body = request.get_json(silent=True) or {}
    for field in ["name", "goal", "startDate", "endDate", "status", "retrospective"]:
        if field in body and body[field] is not None:
            sprint[field] = body[field]
    write_db(db)
    return jsonify(sprint)


@bp.delete("/sprints/<sprint_id>")
def delete_sprint(sprint_id):
    db = read_db()
    original = len(db.get("sprints", []))
    db["sprints"] = [s for s in db.get("sprints", []) if s["id"] != sprint_id]
    if len(db["sprints"]) == original:
        return jsonify({"error": "Sprint not found"}), 404
    for t in db["tasks"]:
        if t.get("sprintId") == sprint_id:
            t["sprintId"] = None
    write_db(db)
    return "", 204


@bp.put("/tasks/<task_id>/sprint")
def assign_task_sprint(task_id):
    db = read_db()
    task = next((t for t in db["tasks"] if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    body = request.get_json(silent=True) or {}
    sprint_id = body.get("sprintId")
    if sprint_id and not any(s["id"] == sprint_id for s in db.get("sprints", [])):
        return jsonify({"error": "Sprint not found"}), 404
    task["sprintId"] = sprint_id
    write_db(db)
    return jsonify(task)


@bp.get("/sprints/<sprint_id>/burndown")
def sprint_burndown(sprint_id):
    data = compute_burndown(read_db(), sprint_id)
    if not data:
        return jsonify({"error": "Sprint not found"}), 404
    return jsonify(data)
