"""
ML-Based Task Assignment Model
================================
Uses scikit-learn's GradientBoostingRegressor to predict assignment quality
scores from historical task–employee data.

GPU / CUDA Upgrade Path
-----------------------
Replace the scikit-learn imports below with NVIDIA RAPIDS cuML for
10–50× speedup on GPU-equipped nodes:

    # CPU (scikit-learn):
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler

    # GPU (cuML — requires CUDA 12 + nvidia-rapids):
    from cuml.ensemble import GradientBoostingRegressor   # type: ignore
    from cuml.preprocessing import StandardScaler         # type: ignore
    # cuML is API-compatible with scikit-learn, so the rest of the code
    # remains unchanged.  Enable via: ML_BACKEND=cuml environment variable.
"""

import json
import os
import time
from datetime import datetime, timezone

import numpy as np

# ── Backend selection: CPU (sklearn) or GPU (cuml) ────────────────────────────
_backend = os.environ.get("ML_BACKEND", "sklearn").lower()

if _backend == "cuml":
    try:
        from cuml.ensemble import GradientBoostingRegressor    # type: ignore
        from cuml.preprocessing import StandardScaler          # type: ignore
        from cuml.model_selection import cross_val_score       # type: ignore
        _BACKEND_NAME = "cuML (CUDA GPU)"
    except ImportError:
        from sklearn.ensemble import GradientBoostingRegressor
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import cross_val_score
        _BACKEND_NAME = "scikit-learn (CPU — cuML not installed)"
else:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score
    _BACKEND_NAME = "scikit-learn (CPU)"

try:
    import joblib
    _JOBLIB_AVAILABLE = True
except ImportError:
    _JOBLIB_AVAILABLE = False

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_BASE, "../models/assignment_model.pkl")
META_PATH  = os.path.join(_BASE, "../models/model_metadata.json")

# ── Constants ─────────────────────────────────────────────────────────────────
PRIORITY_WEIGHT = {"Critical": 1.0, "High": 0.75, "Medium": 0.5, "Low": 0.25}
MIN_SAMPLES = int(os.environ.get("ML_MIN_TRAINING_SAMPLES", "3"))


# ── Feature engineering ───────────────────────────────────────────────────────

def _skill_overlap(required: list, employee_skills: list) -> float:
    """Fraction of required skills the employee possesses."""
    if not required:
        return 0.0
    req = {s.lower() for s in required}
    emp = {s.lower() for s in employee_skills}
    return len(req & emp) / len(req)


def extract_features(required_skills: list, employee: dict, priority: str) -> list:
    """
    Build a 5-dimensional feature vector for a (task, employee) pair.

    Features:
        [0] skill_match       — overlap ratio between required and employee skills  [0, 1]
        [1] workload_norm     — current workload percentage normalised to [0, 1]
        [2] active_tasks_norm — active task count normalised to [0, 1] (capped at 10)
        [3] priority_weight   — ordinal encoding of task priority [0.25, 1.0]
        [4] capacity_flag     — 1 if employee is at capacity (>=5 active tasks), else 0
    """
    skill_match   = _skill_overlap(required_skills, employee.get("skills", []))
    workload_norm = min(employee.get("workload", 0), 100) / 100.0
    active        = employee.get("activeTasks", 0)
    active_norm   = min(active / 10.0, 1.0)
    prio          = PRIORITY_WEIGHT.get(priority, 0.5)
    capacity_flag = 1.0 if active >= 5 else 0.0
    return [skill_match, workload_norm, active_norm, prio, capacity_flag]


# ── Training ──────────────────────────────────────────────────────────────────

def _assignment_quality(task: dict) -> float:
    """
    Derive a quality label (0–1) from a completed task record.
    Higher = better assignment outcome.
    """
    status   = task.get("status", "")
    progress = task.get("progress", 0)
    deadline = task.get("deadline", "")

    if status == "Done":
        base = 1.0
        # Small penalty if finished past deadline
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if dl < datetime.now(timezone.utc):
                base = 0.85
        except (ValueError, AttributeError):
            pass
        return base

    if progress >= 75:
        return 0.65
    if progress >= 50:
        return 0.45
    if progress >= 25:
        return 0.25
    return 0.10


def train(db: dict) -> tuple:
    """
    Train a GradientBoostingRegressor on historical task-assignment pairs.

    Returns:
        (model, metadata_dict) on success
        (None, error_str) if training failed
    """
    emp_map = {e["id"]: e for e in db.get("employees", [])}

    X, y = [], []
    for task in db.get("tasks", []):
        emp_id = task.get("assignedTo")
        if not emp_id or emp_id not in emp_map:
            continue
        emp = emp_map[emp_id]
        X.append(extract_features(
            task.get("requiredSkills", []),
            emp,
            task.get("priority", "Medium"),
        ))
        y.append(_assignment_quality(task))

    if len(X) < MIN_SAMPLES:
        return None, f"Need at least {MIN_SAMPLES} assigned tasks to train (have {len(X)})"

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.float32)

    # ── Build pipeline ────────────────────────────────────────────────────────
    scaler    = StandardScaler()
    regressor = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=3,
        subsample=0.8,
        random_state=42,
    )

    t0 = time.time()
    X_scaled = scaler.fit_transform(X_arr)
    regressor.fit(X_scaled, y_arr)
    train_time = round(time.time() - t0, 3)

    # ── Cross-validation (only if enough samples) ─────────────────────────────
    from sklearn.pipeline import Pipeline as SKPipeline
    from sklearn.pipeline import Pipeline
    full_pipe = Pipeline([("scaler", StandardScaler()), ("reg", GradientBoostingRegressor(
        n_estimators=100, learning_rate=0.1, max_depth=3, subsample=0.8, random_state=42
    ))])

    cv_r2 = None
    if len(X) >= 5:
        try:
            scores = cross_val_score(full_pipe, X_arr, y_arr,
                                     cv=min(5, len(X)), scoring="r2")
            cv_r2 = round(float(np.mean(scores)), 4)
        except Exception:
            cv_r2 = None

    # ── Persist scaler + model separately for inference ───────────────────────
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    artifact = {"scaler": scaler, "model": regressor}
    if _JOBLIB_AVAILABLE:
        import joblib as _jbl
        _jbl.dump(artifact, MODEL_PATH)

    metadata = {
        "trained_at":   datetime.now(timezone.utc).isoformat(),
        "n_samples":    len(X),
        "cv_r2_score":  cv_r2,
        "train_time_s": train_time,
        "model_type":   "GradientBoostingRegressor",
        "backend":      _BACKEND_NAME,
        "features":     ["skill_match", "workload_norm", "active_tasks_norm",
                         "priority_weight", "capacity_flag"],
        "cuda_ready":   _backend == "cuml",
        "min_samples":  MIN_SAMPLES,
    }
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    return artifact, metadata


# ── Inference ─────────────────────────────────────────────────────────────────

def load() -> dict | None:
    """Load a previously trained artifact from disk."""
    if not _JOBLIB_AVAILABLE or not os.path.exists(MODEL_PATH):
        return None
    try:
        import joblib as _jbl
        return _jbl.load(MODEL_PATH)
    except Exception:
        return None


def predict(artifact: dict, required_skills: list, employees: list,
            priority: str) -> list:
    """
    Score every employee for a given task and return them sorted best-first.

    Returns:
        list of (employee_dict, predicted_quality_score)
    """
    scaler = artifact["scaler"]
    model  = artifact["model"]

    results = []
    for emp in employees:
        feat  = np.array([extract_features(required_skills, emp, priority)],
                         dtype=np.float32)
        feat_s = scaler.transform(feat)
        score  = float(model.predict(feat_s)[0])
        score  = max(0.0, min(1.0, score))   # clamp to [0, 1]
        results.append((emp, round(score, 4)))

    return sorted(results, key=lambda x: -x[1])


# ── Status ────────────────────────────────────────────────────────────────────

def status() -> dict:
    """Return metadata about the currently persisted model."""
    if not os.path.exists(META_PATH):
        return {"trained": False, "backend": _BACKEND_NAME}
    try:
        with open(META_PATH) as f:
            meta = json.load(f)
        meta["trained"]       = os.path.exists(MODEL_PATH)
        meta["backend"]       = _BACKEND_NAME
        meta["model_on_disk"] = os.path.exists(MODEL_PATH)
        return meta
    except Exception as exc:
        return {"trained": False, "error": str(exc), "backend": _BACKEND_NAME}
