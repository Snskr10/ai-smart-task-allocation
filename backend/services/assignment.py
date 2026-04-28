"""
Task Assignment AI Service
--------------------------
Provides employee recommendations for a given task.

Strategy:
  1. If a trained ML model exists (scikit-learn GradientBoostingRegressor,
     or cuML GPU variant) → use ML-predicted quality scores.
  2. Fallback → rule-based weighted scoring:
       Score = (skill_match × 0.6) + ((1 - workload) × 0.4)

The ML model is trained via POST /ml/train and persisted to disk.
Once trained it is loaded automatically on every restart.
"""

from config import MAX_SUGGESTED_ACTIVE

from .employees import enrich_employees, skill_match_score
from .projects import normalize_project
from . import ml_model


def normalize_required_skills(body: dict) -> list:
    rs = body.get("requiredSkills")
    if isinstance(rs, list):
        return rs
    if isinstance(rs, str):
        return [s.strip() for s in rs.split(",") if s.strip()]
    return []


def _rule_based_score(skill_match: float, workload: float) -> float:
    """Original heuristic scoring formula."""
    return round((skill_match * 0.6 + (1 - workload) * 0.4) * 10) / 10


def build_assign_ai_response(db: dict, body: dict) -> dict:
    """
    Return a ranked list of employees for the requested task.
    Uses ML scoring when a model is available, rule-based otherwise.
    """
    skills   = normalize_required_skills(body)
    priority = body.get("priority") or "Medium"
    enriched = enrich_employees(db)

    # ── Try ML-based ranking ──────────────────────────────────────────────────
    artifact   = ml_model.load()
    ml_active  = artifact is not None
    ml_backend = ml_model.status().get("backend", "rule-based")

    if ml_active:
        ranked_ml = ml_model.predict(artifact, skills, enriched, priority)
        rankings  = []
        for emp, ml_score in ranked_ml:
            sm     = skill_match_score(skills, emp.get("skills", []))
            wf     = emp.get("workload", 0) / 100.0
            at_cap = emp.get("activeTasks", 0) >= MAX_SUGGESTED_ACTIVE
            rankings.append({
                "employee": {
                    "id":          emp["id"],
                    "name":        emp["name"],
                    "role":        emp["role"],
                    "skills":      emp["skills"],
                    "workload":    emp["workload"],
                    "activeTasks": emp["activeTasks"],
                },
                "skillMatch":     round(sm * 10) / 10,
                "workloadFactor": round(wf, 3),
                "score":          ml_score,        # ML predicted quality [0,1]
                "mlScore":        ml_score,
                "atCapacity":     at_cap,
                "scoringMethod":  "ml",
            })
    else:
        # ── Fallback: rule-based ──────────────────────────────────────────────
        rankings = []
        for emp in enriched:
            sm     = skill_match_score(skills, emp.get("skills", []))
            wf     = emp.get("workload", 0) / 100.0
            score  = _rule_based_score(sm / 100.0, wf)
            at_cap = emp.get("activeTasks", 0) >= MAX_SUGGESTED_ACTIVE
            rankings.append({
                "employee": {
                    "id":          emp["id"],
                    "name":        emp["name"],
                    "role":        emp["role"],
                    "skills":      emp["skills"],
                    "workload":    emp["workload"],
                    "activeTasks": emp["activeTasks"],
                },
                "skillMatch":     round(sm * 10) / 10,
                "workloadFactor": round(wf, 3),
                "score":          score,
                "atCapacity":     at_cap,
                "scoringMethod":  "rule-based",
            })

    # ── Filter at-capacity employees; fall back to full pool if all at cap ────
    available = [r for r in rankings if not r["atCapacity"]]
    pool      = available if available else rankings
    pool      = sorted(pool, key=lambda x: -x["score"])

    recommended = pool[0]
    emp         = recommended["employee"]

    matched_skills = [
        s for s in emp["skills"]
        if any(req.lower() == s.lower() for req in skills)
    ]

    # Human-readable reason includes which engine was used
    if ml_active:
        reason = (
            f"{emp['name']} was ranked top by the ML model "
            f"(predicted quality: {recommended['score']:.2f}, "
            f"skill match: {recommended['skillMatch']}%, "
            f"backend: {ml_backend})."
        )
    else:
        reason = (
            f"{emp['name']} matches {recommended['skillMatch']}% of required skills "
            f"with workload {round(recommended['workloadFactor'] * 100)}% "
            f"(rule-based scoring — train ML model via POST /ml/train for better results)."
        )

    match_pct = max(0, min(100, round(recommended["score"] * 100)))

    return {
        "recommended": {
            "employeeId":    emp["id"],
            "name":          emp["name"],
            "role":          emp["role"],
            "matchScore":    match_pct,
            "skillMatch":    recommended["skillMatch"],
            "workloadFactor": recommended["workloadFactor"],
            "score":         recommended["score"],
            "skills":        matched_skills,
            "reason":        reason,
            "scoringMethod": recommended.get("scoringMethod", "rule-based"),
        },
        "rankings": pool,
        "mlEnabled": ml_active,
        "mlBackend": ml_backend if ml_active else "none",
        "draft": {
            "title":          body.get("title"),
            "description":    body.get("description"),
            "requiredSkills": skills,
            "deadline":       body.get("deadline"),
            "priority":       priority,
            "project":        normalize_project(body.get("project")),
        },
    }
