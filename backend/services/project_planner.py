from datetime import datetime, timezone, timedelta

from datetime_utils import parse_iso
from .employees import enrich_employees, skill_match_score, workload_percent


TASK_TEMPLATES = [
    {
        "key": "frontend",
        "keywords": ["frontend", "ui", "interface", "web app", "website", "react", "design system", "landing page", "portal"],
        "title": "Frontend UI Development",
        "description": "Build responsive user interface components, pages, and navigation flows.",
        "skills": ["React", "TypeScript", "CSS", "Tailwind"],
    },
    {
        "key": "backend",
        "keywords": ["backend", "api", "server", "rest", "endpoint", "microservice", "service layer", "business logic"],
        "title": "Backend API Development",
        "description": "Design and implement RESTful API endpoints with validation and error handling.",
        "skills": ["Node.js", "REST APIs", "Python", "PostgreSQL"],
    },
    {
        "key": "database",
        "keywords": ["database", "data model", "schema", "storage", "postgresql", "mongodb", "migration", "orm"],
        "title": "Database Design & Migration",
        "description": "Design the data schema, set up database infrastructure, and write migration scripts.",
        "skills": ["PostgreSQL", "MongoDB", "Python"],
    },
    {
        "key": "auth",
        "keywords": ["auth", "login", "authentication", "authorization", "security", "permission", "role", "sso", "oauth", "jwt"],
        "title": "Authentication & Access Control",
        "description": "Implement user authentication, role-based authorization, and session management.",
        "skills": ["Node.js", "REST APIs", "Docker"],
    },
    {
        "key": "payment",
        "keywords": ["payment", "stripe", "checkout", "billing", "subscription", "invoice", "transaction"],
        "title": "Payment & Billing Integration",
        "description": "Integrate payment gateway, handle webhooks, and manage subscription lifecycle.",
        "skills": ["Stripe", "Node.js", "REST APIs"],
    },
    {
        "key": "devops",
        "keywords": ["deploy", "devops", "infrastructure", "cloud", "kubernetes", "docker", "aws", "ci/cd", "pipeline", "terraform", "container"],
        "title": "Infrastructure & CI/CD",
        "description": "Set up cloud infrastructure, containerization, automated pipelines, and deployment workflows.",
        "skills": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
    },
    {
        "key": "testing",
        "keywords": ["test", "testing", "qa", "quality", "automation", "e2e", "regression", "coverage"],
        "title": "QA & Test Automation",
        "description": "Write automated unit, integration, and end-to-end test suites with coverage reporting.",
        "skills": ["Jest", "Cypress", "Playwright", "API Testing"],
    },
    {
        "key": "ml",
        "keywords": ["machine learning", "ml", "ai model", "prediction", "classification", "nlp", "training", "neural", "deep learning", "recommendation"],
        "title": "ML Model Development",
        "description": "Develop, train, and evaluate machine learning models powering the core AI features.",
        "skills": ["Python", "TensorFlow", "scikit-learn", "Pandas"],
    },
    {
        "key": "data",
        "keywords": ["data pipeline", "etl", "data engineering", "analytics", "reporting", "dashboard", "metrics", "kpi", "visualization"],
        "title": "Data Pipeline & Analytics",
        "description": "Build data ingestion pipelines, transformation jobs, and analytics reporting dashboards.",
        "skills": ["Python", "Pandas", "PostgreSQL", "AWS"],
    },
    {
        "key": "mobile",
        "keywords": ["mobile", "ios", "android", "native app", "react native", "responsive"],
        "title": "Mobile Development",
        "description": "Build mobile-first responsive views and native mobile application screens.",
        "skills": ["React", "TypeScript", "CSS", "Accessibility"],
    },
    {
        "key": "monitoring",
        "keywords": ["monitor", "observability", "logging", "metrics", "alerts", "grafana", "tracing", "sre"],
        "title": "Observability & Monitoring",
        "description": "Configure logging, metrics collection, distributed tracing, and alerting dashboards.",
        "skills": ["Monitoring", "Docker", "Terraform", "AWS"],
    },
    {
        "key": "ux",
        "keywords": ["ux", "user experience", "wireframe", "prototype", "figma", "accessibility", "a11y", "branding"],
        "title": "UX / Design System",
        "description": "Create wireframes, design prototypes, accessibility-compliant components, and a cohesive design system.",
        "skills": ["Figma", "CSS", "Accessibility", "Tailwind"],
    },
]

_DEFAULT_KEYS = ["frontend", "backend", "testing"]


def _detect_templates(description):
    desc_lower = description.lower()
    matched = []
    seen_keys = set()
    for tmpl in TASK_TEMPLATES:
        if any(kw in desc_lower for kw in tmpl["keywords"]):
            if tmpl["key"] not in seen_keys:
                matched.append(tmpl)
                seen_keys.add(tmpl["key"])
    if len(matched) < 3:
        for tmpl in TASK_TEMPLATES:
            if tmpl["key"] in _DEFAULT_KEYS and tmpl["key"] not in seen_keys:
                matched.append(tmpl)
                seen_keys.add(tmpl["key"])
    return matched


def _score(employee, task_skills, all_tasks, extra_penalty):
    sm = skill_match_score(task_skills, employee["skills"])
    wl = workload_percent(all_tasks, employee["id"])
    score = round((sm - wl - extra_penalty * 15) * 10) / 10
    return score, sm, wl


def plan_project(db, body):
    proj_title = (body.get("title") or "Project").strip()
    description = (body.get("description") or "").strip()
    deadline_str = body.get("deadline") or ""
    priority = body.get("priority") or "Medium"

    templates = _detect_templates(description)

    now = datetime.now(timezone.utc)
    try:
        project_end = parse_iso(deadline_str) if deadline_str else (now + timedelta(days=30))
    except Exception:
        project_end = now + timedelta(days=30)

    span_days = max(len(templates), (project_end - now).days)
    step = max(1, span_days // len(templates))

    enriched = enrich_employees(db)
    all_tasks = db["tasks"]

    assignment_counts: dict[str, int] = {}
    planned = []

    for i, tmpl in enumerate(templates):
        task_dl = min(now + timedelta(days=step * (i + 1)), project_end)
        task_dl_iso = task_dl.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        scored = []
        for emp in enriched:
            penalty = assignment_counts.get(emp["id"], 0)
            score, sm, wl = _score(emp, tmpl["skills"], all_tasks, penalty)
            scored.append({"id": emp["id"], "name": emp["name"], "role": emp["role"],
                           "skills": emp["skills"], "score": score, "skillMatch": sm,
                           "workload": wl, "activeTasks": emp["activeTasks"]})

        scored.sort(key=lambda x: -x["score"])
        best = scored[0]
        assignment_counts[best["id"]] = assignment_counts.get(best["id"], 0) + 1

        match_pct = max(0, min(100, round(50 + best["score"] * 0.5)))

        planned.append({
            "taskTitle": f"{proj_title} — {tmpl['title']}",
            "description": tmpl["description"],
            "requiredSkills": tmpl["skills"],
            "deadline": task_dl_iso,
            "priority": priority,
            "suggestedEmployee": {
                "id": best["id"],
                "name": best["name"],
                "role": best["role"],
                "skills": best["skills"],
                "workload": best["workload"],
                "activeTasks": best["activeTasks"],
                "matchScore": match_pct,
                "skillMatch": best["skillMatch"],
            },
            "alternatives": [
                {"id": s["id"], "name": s["name"], "role": s["role"],
                 "workload": s["workload"], "skillMatch": s["skillMatch"]}
                for s in scored[1:6]
            ],
        })

    return {
        "project": proj_title,
        "description": description,
        "deadline": project_end.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "priority": priority,
        "tasks": planned,
    }
