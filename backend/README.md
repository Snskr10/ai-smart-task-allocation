# Backend — Flask API

Python/Flask REST API powering the AI-Based Smart Task Allocation System.

---

## Stack

| Technology | Purpose |
|---|---|
| Python 3.11 | Runtime |
| Flask 3 | Web framework |
| Flask-CORS | Cross-origin resource sharing |
| Gunicorn | Production WSGI server |
| scikit-learn | ML task assignment model |
| NumPy | Numerical feature computation |
| joblib | Model persistence |
| cuML (optional) | GPU-accelerated ML via NVIDIA RAPIDS |

---

## Structure

```
backend/
├── app.py                  # Flask application factory + /health endpoint
├── config.py               # Environment-based configuration
├── database.py             # JSON flat-file read/write helpers
├── datetime_utils.py       # ISO date formatting utilities
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── data/
│   ├── seed.json           # Initial employees, tasks, projects
│   └── db.json             # Live database (git-ignored)
├── models/                 # Persisted ML artifacts (git-ignored)
│   ├── assignment_model.pkl
│   └── model_metadata.json
├── routes/
│   ├── auth_routes.py      # POST /auth/login
│   ├── task_routes.py      # CRUD /tasks, /tasks/:id/progress
│   ├── employee_routes.py  # GET /employees, /employees/:id
│   ├── project_routes.py   # CRUD /projects
│   ├── sprint_routes.py    # CRUD /sprints
│   ├── alert_routes.py     # GET /alerts (silent failures)
│   ├── dashboard_routes.py # GET /dashboard
│   └── ml_routes.py        # POST /ml/train, GET /ml/status, POST /ml/predict
└── services/
    ├── ml_model.py         # ML training, prediction, feature engineering
    ├── assignment.py       # AI assignment logic (ML + rule-based fallback)
    ├── alerts.py           # Silent failure detection rules
    ├── project_planner.py  # NL → task generation
    ├── sprints.py          # Sprint business logic
    ├── employees.py        # Employee helpers
    ├── projects.py         # Project helpers
    ├── task_utils.py       # Task shared utilities
    └── dashboard.py        # Dashboard aggregation
```

---

## Setup

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py
# → http://localhost:3001
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the Flask app listens on |
| `ML_ENABLED` | `true` | Enable/disable ML model |
| `ML_BACKEND` | `sklearn` | `sklearn` (CPU) or `cuml` (GPU) |
| `ML_MIN_TRAINING_SAMPLES` | `5` | Minimum tasks needed to train |
| `ML_MODEL_TYPE` | `gradient_boosting` | Model type identifier |
| `SILENT_FAILURE_DAYS_NO_UPDATE` | `3` | Days without update before alert |
| `SILENT_FAILURE_PROGRESS_THRESHOLD` | `20` | Progress % below which alert fires |

---

## Key API Endpoints

### Authentication
```
POST /api/auth/login
Body: { "email": "...", "password": "..." }
```

### Tasks
```
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id/progress   # Also accepts dependencies[]
DELETE /api/tasks/:id
```

### AI Assignment
```
POST /api/assign-ai
Body: { "skills": [...], "priority": "High", "title": "..." }
Returns: { recommended, rankings, mlEnabled, mlBackend }
```

### ML Model
```
POST /api/ml/train    # Train on historical task data
GET  /api/ml/status   # { trained, backend, r2Score, trainingSamples }
POST /api/ml/predict  # { skills, priority } → ranked employees
```

### Health Check
```
GET /health
Returns: { status: "ok", version: "2.0.0", ml: { trained, backend } }
```

---

## ML Model Details

The model is a `GradientBoostingRegressor` that predicts an *assignment quality score* (0–1) for each employee-task pair.

**Feature vector (5 dimensions):**

```
[skill_match_ratio, workload_normalized, active_tasks_normalized, priority_weight, capacity_flag]
```

**Training:**
- Samples are built from all completed tasks
- Quality score derived from on-time completion and progress
- StandardScaler applied before training
- 5-fold cross-validation reports R² score
- Model persisted to `models/assignment_model.pkl`

**GPU Upgrade Path:**
```python
# In ml_model.py, swapping backend is one env var:
ML_BACKEND=cuml  # Uses NVIDIA RAPIDS cuML instead of scikit-learn
```

---

## Docker

```bash
# Build
docker build -t silentflow-backend .

# Run
docker run -p 3001:3001 silentflow-backend
```

See [`../docker-compose.yml`](../docker-compose.yml) for multi-service setup.
