# Kubernetes Deployment Guide

## Prerequisites
- kubectl configured against your cluster
- Docker images built and pushed to a registry
- metrics-server installed (for HPA)

## Deploy

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Apply config
kubectl apply -f configmap.yaml

# 3. Deploy backend (includes PVCs)
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# 4. Deploy frontend
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# 5. Enable auto-scaling
kubectl apply -f hpa.yaml

# 6. Expose via Ingress
kubectl apply -f ingress.yaml

# Monitor
kubectl get all -n silentflow
kubectl get hpa  -n silentflow --watch
kubectl logs -n silentflow -l component=backend --follow
```

## GPU / CUDA Deployment

To enable GPU-accelerated ML inference:
1. Install NVIDIA device plugin: `kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml`
2. Uncomment the `nvidia.com/gpu: 1` resource limit in `backend-deployment.yaml`
3. Rebuild the backend image using the CUDA stage in `backend/Dockerfile`
4. Set `ML_MODEL_TYPE: "cuml.GradientBoostingRegressor"` in `configmap.yaml`
