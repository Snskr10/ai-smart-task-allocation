# Kubernetes Deployment Guide

Production deployment manifests for the AI-Based Smart Task Allocation System using Kubernetes.

---

## Overview

```
Namespace: silentflow
│
├── ConfigMap: silentflow-config          # Runtime configuration
├── Backend Deployment (2–10 pods)        # Flask/Gunicorn API
│   ├── Service: silentflow-backend       # ClusterIP :3001
│   ├── PVC: silentflow-db-pvc            # db.json persistence
│   ├── PVC: silentflow-models-pvc        # ML model persistence
│   └── HPA: backend-hpa                 # Auto-scale on CPU/Memory
├── Frontend Deployment (2 pods)          # React/Nginx static app
│   └── Service: silentflow-frontend      # ClusterIP :80
└── Ingress                               # Routes / → frontend, /api → backend
```

---

## Manifests

| File | Resource | Description |
|---|---|---|
| `namespace.yaml` | Namespace | `silentflow` namespace |
| `configmap.yaml` | ConfigMap | Backend env vars + ML settings |
| `backend-deployment.yaml` | Deployment + PVCs | Backend pods + storage |
| `backend-service.yaml` | Service (ClusterIP) | Internal backend routing |
| `frontend-deployment.yaml` | Deployment | Frontend pods |
| `frontend-service.yaml` | Service (ClusterIP) | Internal frontend routing |
| `hpa.yaml` | HorizontalPodAutoscaler | Scale backend 2–10 pods |
| `ingress.yaml` | Ingress | External HTTP routing |

---

## Prerequisites

- Kubernetes cluster (local: [minikube](https://minikube.sigs.k8s.io/) or [kind](https://kind.sigs.k8s.io/), cloud: EKS/GKE/AKS)
- `kubectl` configured for your cluster
- Nginx Ingress Controller installed
- Docker images pushed to a registry

---

## Deploy

### 1. Apply all manifests

```bash
kubectl apply -f k8s/
```

Or apply in order:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

### 2. Monitor rollout

```bash
# Check pods
kubectl get pods -n silentflow

# Check services
kubectl get svc -n silentflow

# Check HPA
kubectl get hpa -n silentflow

# Watch rollout
kubectl rollout status deployment/silentflow-backend -n silentflow
kubectl rollout status deployment/silentflow-frontend -n silentflow
```

### 3. Access the application

```bash
# Get the Ingress IP
kubectl get ingress -n silentflow

# Add to /etc/hosts (local cluster)
echo "YOUR_INGRESS_IP silentflow.local" | sudo tee -a /etc/hosts
```

Then open `http://silentflow.local` in your browser.

---

## Horizontal Pod Autoscaler

The backend automatically scales between **2 and 10 replicas** based on:

| Metric | Target |
|---|---|
| CPU Utilization | 60% average |
| Memory Usage | 400Mi average |

```bash
# Watch HPA scaling in real time
kubectl get hpa -n silentflow --watch
```

---

## Configuration (ConfigMap)

Edit `configmap.yaml` to change runtime settings without rebuilding images:

```yaml
data:
  FLASK_ENV: "production"
  ML_ENABLED: "true"
  ML_BACKEND: "sklearn"          # Change to "cuml" for GPU
  ML_MIN_TRAINING_SAMPLES: "5"
  SILENT_FAILURE_DAYS_NO_UPDATE: "3"
  SILENT_FAILURE_PROGRESS_THRESHOLD: "20"
```

Apply changes:
```bash
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/silentflow-backend -n silentflow
```

---

## GPU / CUDA Deployment

To run the ML model on an NVIDIA GPU:

### 1. Update ConfigMap
```yaml
ML_BACKEND: "cuml"
```

### 2. Update backend Deployment resource limits
Uncomment in `backend-deployment.yaml`:
```yaml
resources:
  limits:
    nvidia.com/gpu: "1"
```

### 3. Install NVIDIA device plugin
```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml
```

### 4. Enable cuML in requirements
Uncomment in `backend/requirements.txt`:
```
cuml-cu12; extra == "cuda"
```

Rebuild and push the backend image, then:
```bash
kubectl rollout restart deployment/silentflow-backend -n silentflow
```

---

## Update Image After CI/CD Push

When a new Docker image is built via GitHub Actions, update the deployment:

```bash
# Replace with your actual image tag (SHA from CI)
kubectl set image deployment/silentflow-backend \
  backend=your-dockerhub-user/silentflow-backend:sha-abc1234 \
  -n silentflow

kubectl set image deployment/silentflow-frontend \
  frontend=your-dockerhub-user/silentflow-frontend:sha-abc1234 \
  -n silentflow

# Wait for rollout
kubectl rollout status deployment/silentflow-backend -n silentflow
```

---

## Teardown

```bash
# Delete all resources in the namespace
kubectl delete namespace silentflow
```

---

## Logs & Debugging

```bash
# Backend logs
kubectl logs -l app=silentflow-backend -n silentflow --tail=100 -f

# Frontend logs
kubectl logs -l app=silentflow-frontend -n silentflow --tail=50

# Describe a pod (for events/errors)
kubectl describe pod -l app=silentflow-backend -n silentflow

# Exec into a backend pod
kubectl exec -it deployment/silentflow-backend -n silentflow -- /bin/bash
```

---

## Local Development with minikube

```bash
# Start minikube
minikube start

# Enable ingress addon
minikube addons enable ingress

# Point Docker to minikube's daemon (no registry needed)
eval $(minikube docker-env)

# Build images locally
docker build -t silentflow-backend:latest ./backend
docker build -t silentflow-frontend:latest ./frontend

# Deploy
kubectl apply -f k8s/

# Get URL
minikube service silentflow-frontend -n silentflow --url
```
