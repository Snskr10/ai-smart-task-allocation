# AI-Based Smart Task Allocation System

> An intelligent full-stack project management platform that uses Machine Learning to automatically assign tasks to the best-suited team members, detect silent task failures, and provide data-driven sprint analytics.

[![CI/CD](https://github.com/Snskr10/ai-smart-task-allocation/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Snskr10/ai-smart-task-allocation/actions/workflows/ci-cd.yml)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?logo=kubernetes)
![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E?logo=scikit-learn)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Local Development](#local-development)
  - [Docker Compose](#docker-compose)
  - [Kubernetes](#kubernetes)
- [ML Model](#ml-model)
- [CI/CD Pipeline](#cicd-pipeline)
- [Screenshots](#screenshots)
- [API Reference](#api-reference)

---

## Overview

This system solves a core challenge in software project management: **assigning the right task to the right person at the right time**. Managers waste significant time manually matching employee skills to task requirements. This platform automates that process using a trained ML model while also monitoring for tasks that are silently at risk (no updates, overdue, low progress).

The system targets two roles:
- **Manager** — full access to task creation, AI-based assignment, sprint planning, analytics, and team management.
- **Employee** — personal dashboard to track assigned tasks, update progress, and view their performance.

---

## Features

### Core
| Feature | Description |
|---|---|
| AI Task Assignment | ML model (GradientBoostingRegressor) ranks employees by skill match, workload, and historical performance |
| Silent Failure Detection | Automated rule engine flags tasks with no progress updates, missed deadlines, or low completion |
| AI Project Planner | Natural language → structured task list with auto-assignment |
| Sprint Management | Create sprints, assign tasks, track burndown and velocity charts |
| Kanban Board | Drag-and-drop task workflow (To Do → In Progress → Testing → Done) |
| Role-Based Access | Manager and Employee roles with protected routes |

### Advanced UI
| Feature | Description |
|---|---|
| Global Search | `Ctrl+K` command-palette search across tasks and employees |
| Task Dependencies | Block/unblock tasks, visualize dependency chains |
| Task Detail Modal | Full task view with comments, status edits, and dependency management |
| Employee Profile | Dedicated page with performance stats, skill list, and full task history |
| Dark / Light Mode | System-wide theme toggle persisted to localStorage |
| Project Analytics | Per-project charts — completion rate, overdue count, team distribution |
| Sprint Velocity Chart | Planned vs. completed tasks across all sprints |
| Sprint Retrospectives | Capture and view retrospective notes when completing a sprint |
| AI Re-assignment | One-click AI suggestion for at-risk tasks from the alerts page |

### SEAI / Infrastructure
| Feature | Description |
|---|---|
| Docker | Multi-stage Dockerfiles for backend (Gunicorn) and frontend (Nginx) |
| Docker Compose | Single-command local deployment with shared volumes and health checks |
| Kubernetes | Full production manifests — Deployment, Service, HPA, Ingress, ConfigMap |
| CUDA / GPU Upgrade | cuML (NVIDIA RAPIDS) drop-in replacement for CPU scikit-learn |
| GitHub Actions CI/CD | Automated test → build → Docker push → Kubernetes deploy pipeline |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│              React 19 + TypeScript + Tailwind CSS               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API (/api/*)
┌──────────────────────────▼──────────────────────────────────────┐
│                    Nginx (Frontend Container)                    │
│           Serves static React build + proxies /api/*            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               Flask Backend (Gunicorn, port 3001)               │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │   Auth   │  │  Tasks   │  │ Sprints  │  │  ML Routes   │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              ML Service (ml_model.py)                    │  │
│   │   GradientBoostingRegressor  ←→  cuML (CUDA upgrade)    │  │
│   └──────────────────────────────────────────────────────────┘  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              JSON Flat-file Database (db.json)           │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Kubernetes (Production):
  Namespace: silentflow
  Backend Deployment (2-10 pods, HPA on CPU/Memory)
  Frontend Deployment (2 pods)
  Ingress → routes / → frontend, /api → backend
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Backend | Python 3.11, Flask 3, Flask-CORS |
| WSGI Server | Gunicorn |
| ML | scikit-learn (GradientBoostingRegressor), NumPy, joblib |
| GPU/CUDA | NVIDIA RAPIDS cuML (optional upgrade) |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (Deployment, HPA, Ingress, ConfigMap) |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions |
| Database | JSON flat-file (db.json) |

---

## Project Structure

```
ai-smart-task-allocation/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions pipeline
├── backend/
│   ├── routes/                # Flask API blueprints
│   ├── services/              # Business logic + ML model
│   │   └── ml_model.py        # scikit-learn / cuML model
│   ├── data/
│   │   └── seed.json          # Initial seed data
│   ├── Dockerfile             # Multi-stage backend image
│   ├── requirements.txt
│   └── app.py                 # Flask entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── context/           # Auth + Theme context
│   │   └── lib/               # API client + utilities
│   ├── nginx.conf             # Nginx config for static + proxy
│   └── Dockerfile             # Multi-stage frontend image
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   └── ingress.yaml
├── docker-compose.yml         # Local multi-service deployment
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional)
- kubectl (optional, for Kubernetes)

### Local Development

**1. Clone the repository**
```bash
git clone https://github.com/Snskr10/ai-smart-task-allocation.git
cd ai-smart-task-allocation
```

**2. Start the Backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python app.py
# Backend runs at http://localhost:3001
```

**3. Start the Frontend**
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

**4. Login credentials**

| Role | Email | Password |
|---|---|---|
| Manager | manager@example.com | password |
| Employee | alice@example.com | password |

---

### Docker Compose

Run the entire stack with a single command:

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:3001 |

Stop with:
```bash
docker-compose down
```

---

### Kubernetes

See the full guide in [`k8s/README.md`](k8s/README.md).

Quick start:
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n silentflow
kubectl get hpa -n silentflow
```

---

## ML Model

The AI assignment engine uses a **GradientBoostingRegressor** trained on historical task completion data.

### Features Used
| Feature | Description |
|---|---|
| Skill Match Score | Overlap between task required skills and employee skills |
| Workload | Employee's current active task count (normalized) |
| Active Tasks | Number of in-progress tasks (normalized) |
| Priority Weight | Task priority mapped to numeric weight |
| Capacity Flag | Whether employee is under/over capacity |

### Training
```
POST /api/ml/train
```
Trains on all completed tasks in the database. Requires a minimum of 5 samples. Reports cross-validated R² score.

### GPU Acceleration (CUDA)
To enable GPU-accelerated training using NVIDIA RAPIDS cuML:
1. Ensure CUDA 12+ is installed
2. Set `ML_BACKEND=cuml` in environment variables or Kubernetes ConfigMap
3. Uncomment `cuml-cu12` in `backend/requirements.txt`

---

## CI/CD Pipeline

```
Push to main
     │
     ├── test-backend      → pytest + import smoke tests
     ├── test-frontend     → tsc --noEmit + production build
     │
     └── docker-build-push → Build & push backend + frontend images to Docker Hub
              │
              └── k8s-deploy (production env, manual approval)
                       → kubectl apply -f k8s/
                       → Update image tags to new SHA
                       → Wait for rollout
```

Configure these GitHub Actions secrets for full CI/CD:

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `KUBECONFIG` | Base64-encoded kubeconfig for your cluster |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and receive user session |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/:id/progress` | Update task progress / dependencies |
| GET | `/api/employees` | List all employees |
| POST | `/api/assign-ai` | Get AI assignment suggestion for a task |
| GET | `/api/alerts` | Get silent failure alerts |
| GET | `/api/sprints` | List all sprints |
| POST | `/api/sprints` | Create a new sprint |
| PUT | `/api/sprints/:id` | Update sprint (status, retrospective) |
| GET | `/api/projects` | List all projects |
| POST | `/api/ml/train` | Train the ML assignment model |
| GET | `/api/ml/status` | Get ML model metadata and status |
| POST | `/api/ml/predict` | Predict best employee for a task |
| GET | `/health` | Health check (API + ML status) |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
