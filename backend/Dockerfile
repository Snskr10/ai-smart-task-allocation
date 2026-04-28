# ─── Stage 1: base ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# System deps for numpy/scikit-learn builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Stage 2: production ─────────────────────────────────────────────────────
FROM base AS production

COPY . .

# Exclude local venv and model artefacts that will be mounted as volumes
RUN rm -rf .venv __pycache__ **/__pycache__

# Create models directory for trained ML artefacts
RUN mkdir -p /app/models /app/data

# ─── Health check ─────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use Gunicorn in production (multi-worker WSGI server)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:3001", \
     "--workers", "2", \
     "--threads", "4", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]

# ─── GPU / CUDA variant (uncomment to enable NVIDIA RAPIDS cuML) ──────────────
# FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04 AS cuda
# RUN apt-get update && apt-get install -y python3.11 python3-pip curl build-essential
# RUN pip install cuml-cu12 --extra-index-url=https://pypi.nvidia.com
# COPY --from=base /app /app
# CMD ["gunicorn", "--bind", "0.0.0.0:3001", "--workers", "2", "app:app"]
