"""
ML Management Endpoints
------------------------
POST /ml/train   — train the assignment model on current task data
GET  /ml/status  — get model metadata, accuracy, training history
POST /ml/predict — run inference for a given task (same as assign-ai but ML-only)
"""

from flask import Blueprint, jsonify, request

from database import read_db
from services import ml_model
from services.employees import enrich_employees

bp = Blueprint("ml_api", __name__, url_prefix="/ml")

# Cache the loaded artifact in memory (reloaded after each training)
_artifact_cache: dict | None = None


def _get_artifact() -> dict | None:
    global _artifact_cache
    if _artifact_cache is None:
        _artifact_cache = ml_model.load()
    return _artifact_cache


@bp.post("/train")
def train():
    """Train the ML model on all current task-assignment history."""
    global _artifact_cache
    db = read_db()
    artifact, result = ml_model.train(db)
    if artifact is None:
        return jsonify({"success": False, "error": result}), 400
    _artifact_cache = artifact
    return jsonify({"success": True, "metadata": result}), 200


@bp.get("/status")
def get_status():
    """Return current model metadata and training status."""
    return jsonify(ml_model.status())


@bp.post("/predict")
def predict():
    """
    Run ML-based assignment prediction for a task.

    Body:
        requiredSkills: string[]
        priority: string
        title: string (optional)
    """
    global _artifact_cache
    db   = read_db()
    body = request.get_json(silent=True) or {}

    artifact = _get_artifact()
    if artifact is None:
        return jsonify({
            "success": False,
            "error": "Model not trained yet. POST /ml/train first.",
        }), 400

    skills   = body.get("requiredSkills") or []
    priority = body.get("priority") or "Medium"
    employees = enrich_employees(db)

    ranked = ml_model.predict(artifact, skills, employees, priority)
    return jsonify({
        "success": True,
        "ranked": [
            {
                "employee": emp,
                "predicted_quality": score,
                "skill_match_pct": round(
                    len({s.lower() for s in skills} &
                        {s.lower() for s in emp.get("skills", [])}) /
                    max(len(skills), 1) * 100, 1
                ),
            }
            for emp, score in ranked
        ],
        "model_backend": ml_model.status().get("backend", "unknown"),
    })
