from flask import Blueprint, jsonify, request

from database import read_db

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    role = body.get("role")
    if role == "manager":
        return jsonify(
            {
                "token": "demo-manager",
                "user": {"id": "mgr-1", "role": "manager", "name": "Demo Manager"},
            }
        )
    if role == "employee":
        eid = body.get("employeeId")
        db = read_db()
        emp = next((e for e in db["employees"] if e["id"] == eid), None)
        if not emp:
            return jsonify({"error": "Invalid employee"}), 400
        return jsonify(
            {
                "token": f"demo-{eid}",
                "user": {
                    "id": emp["id"],
                    "role": "employee",
                    "name": emp["name"],
                    "employeeId": emp["id"],
                },
            }
        )
    return jsonify({"error": "Invalid role"}), 400
