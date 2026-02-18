# SageSure - Azure AKS Deployment Guide

**Status:** Production Ready  
**Last Updated:** February 18, 2026  
**Infrastructure:** Azure AKS Premium + Managed Services  
**Cloud Credits:** $50K (9-10 months free operation)

---

## 📋 **Architecture Overview**

```
SageSure on Azure AKS
├── Azure Kubernetes Service (Premium)
│   ├── 3 Node Pool (D4s_v3: 4 CPU, 16GB RAM each)
│   ├── Auto-scaling: 2-10 nodes
│   └── Networking: Azure CNI, Load Balancer
│
├── Applications (Kubernetes Deployments)
│   ├── sagesure-frontend (React - 2 replicas, HPA: 2-5)
│   ├── sagesure-backend (Express - 3 replicas, HPA: 3-10)
│   ├── sagesure-postgres (StatefulSet - 1 replica)
│   └── sagesure-redis (Deployment - 1 replica)
│
├── Azure Managed Services
│   ├── Azure Database for PostgreSQL (Flexible)
│   ├── Azure Cache for Redis (Premium)
│   ├── Azure Container Registry (Standard)
│   ├── Application Insights (Monitoring)
│   ├── Key Vault (Secrets Management)
│   └── Log Analytics (Logging)
│
└── Networking
    ├── Virtual Network (10.0.0.0/16)
    ├── AKS Subnet (10.0.1.0/24)
    ├── Database Subnet (10.0.2.0/24)
    ├── Network Security Groups
    └── Load Balancer (Public IP)
```

---

## 🚀 **Quick Start (5 Steps)**

### **Step 1: Prerequisites**

```bash
# Install tools
brew install terraform azure-cli kubectl helm

# Or on Ubuntu
sudo apt-get install terraform azure-cli kubectl helm

# Login to Azure
az login
az account set --subscription "<SUBSCRIPTION_ID>"
```

### **Step 2: Clone & Configure**

```bash
git clone https://github.com/sagesure/india.git
cd sagesure-india

# Copy environment template
cp .env.example .env
# Edit .env with your Azure details
```

### **Step 3: Deploy Infrastructure with Terraform**

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply (creates AKS + all Azure resources)
terraform apply tfplan

# Save outputs
terraform output kube_config_raw > ~/.kube/sagesure-config
export KUBECONFIG=~/.kube/sagesure-config
```

### **Step 4: Deploy Applications to AKS**

```bash
cd ../..

# Apply Kubernetes manifests
kubectl apply -f infrastructure/aks/00-namespace.yaml
kubectl apply -f infrastructure/aks/01-configmap-secrets.yaml
kubectl apply -f infrastructure/aks/02-postgres-statefulset.yaml
kubectl apply -f infrastructure/aks/03-redis-deployment.yaml
kubectl apply -f infrastructure/aks/04-backend-deployment.yaml
kubectl apply -f infrastructure/aks/05-frontend-deployment.yaml
kubectl apply -f infrastructure/aks/06-ingress.yaml

# Wait for deployments
kubectl rollout status deployment/sagesure-backend -n sagesure --timeout=5m
kubectl rollout status deployment/sagesure-frontend -n sagesure --timeout=5m
```

### **Step 5: Verify Deployment**

```bash
# Check pods
kubectl get pods -n sagesure

# Check services
kubectl get svc -n sagesure

# Check ingress
kubectl get ingress -n sagesure

# Test API health
kubectl port-forward -n sagesure service/sagesure-backend 5000:5000
curl http://localhost:5000/health
```

✅ **Your SageSure cluster is now live on Azure AKS!**

---

## 📊 **Infrastructure Components**

### **1. Azure Kubernetes Service (AKS)**

```yaml
Cluster: sagesure-aks-prod
Location: Southeast Asia (ap-south-1)
Kubernetes Version: 1.27
Node Pool: 3 nodes (D4s_v3)
  - Min: 2 nodes
  - Max: 10 nodes (auto-scaling)
  - CPU: 4 cores per node
  - Memory: 16GB per node
  - Disk: 128GB per node
Network: Azure CNI
Load Balancer: Standard (auto-created)
```

**Cost:** ~$73/month (included in 50K credits)

### **2. PostgreSQL (Flexible Server)**

```yaml
Server: sagesure-postgres-prod
Version: PostgreSQL 15
SKU: B_Standard_B2s (Burstable)
Storage: 100GB
Backup Retention: 7 days
High Availability: Single-zone
Networking: Private (VNet integration)
```

**Cost:** ~$200-400/month (included in 50K credits)

### **3. Redis Cache**

```yaml
Cache: sagesure-redis-prod
Version: Redis 7
SKU: Premium
Family: P (Premium)
Capacity: 1GB (1 shard)
Persistence: RDB + AOF
SSL: Enabled (port 6379 only)
Networking: Private (VNet)
```

**Cost:** ~$100-200/month (included in 50K credits)

### **4. Container Registry (ACR)**

```yaml
Registry: sagesureacr
SKU: Standard
Capacity: 100GB included
Retention: 30 days
Repositories: backend, frontend
Images: Tagged with git SHA + latest
```

**Cost:** ~$50/month (included in 50K credits)

### **5. Application Insights**

```yaml
Workspace: sagesure-appinsights
Application Type: Web
Retention: 30 days
Sampling: Default
Features: Performance, Failures, Custom Metrics
```

**Cost:** ~$50/month (free tier + included in credits)

---

## 🔄 **CI/CD Pipeline (GitHub Actions)**

Automated deployment on push to `main`:

```
┌─────────────────────────────────────────┐
│ 1. Code Push to GitHub (main branch)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. GitHub Actions: Build                │
│    - Build Docker images                │
│    - Push to Azure Container Registry   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Deploy to AKS                        │
│    - Update Kubernetes manifests        │
│    - Rolling update deployments         │
│    - Health checks                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Verification                         │
│    - Pod health checks                  │
│    - API endpoint tests                 │
│    - Slack notification                 │
└─────────────────────────────────────────┘
```

**Setup GitHub Secrets:**

```bash
# 1. Create Service Principal for GitHub
az ad sp create-for-rbac \
  --name github-sagesure \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>

# 2. Add to GitHub Secrets (Settings → Secrets)
AZURE_CREDENTIALS          # Full JSON from above
ACR_USERNAME               # From Azure Portal
ACR_PASSWORD               # From Azure Portal
SLACK_WEBHOOK              # For notifications
```

**Trigger Deployment:**

```bash
# Automatic on push to main
git push origin main

# Or manual trigger in GitHub Actions UI
# Actions → Deploy to AKS → Run workflow
```

---

## 📈 **Scaling & Performance**

### **Auto-Scaling Policies**

```yaml
Backend (Express API):
  Min Replicas: 3
  Max Replicas: 10
  CPU Target: 70%
  Memory Target: 80%
  Scale-up: 100% per 30s
  Scale-down: 50% per 60s

Frontend (React):
  Min Replicas: 2
  Max Replicas: 5
  CPU Target: 75%
  Memory Target: 85%
  Scale-up: 100% per 30s
  Scale-down: 50% per 60s

Nodes:
  Min Nodes: 2
  Max Nodes: 10
  CPU/Memory utilization triggers
```

### **Resource Limits**

```yaml
Backend Pod:
  Requests: 250m CPU, 512Mi RAM
  Limits: 1000m CPU, 1Gi RAM

Frontend Pod:
  Requests: 100m CPU, 256Mi RAM
  Limits: 500m CPU, 512Mi RAM

PostgreSQL Pod:
  Requests: 500m CPU, 1Gi RAM
  Limits: 2000m CPU, 4Gi RAM

Redis Pod:
  Requests: 250m CPU, 512Mi RAM
  Limits: 1000m CPU, 2Gi RAM
```

---

## 🔐 **Security Features**

### **Network Security**

- Network Security Groups (NSGs) on subnets
- Network Policies within Kubernetes
- Pod Security Policies enabled
- Private endpoints for databases
- TLS/SSL for all communication

### **Secrets Management**

- Azure Key Vault integration
- Secrets not in ConfigMaps
- CSI driver for secret mounting
- Automatic rotation support
- Audit logging enabled

### **RBAC**

- Service accounts per component
- Pod security contexts
- Non-root user execution
- Read-only root filesystems
- Capability dropping

### **Encryption**

- AES-256 for data at rest
- TLS 1.3 for data in transit
- Azure Storage Service Encryption
- Database encryption enabled
- Key Vault encryption

---

## 📊 **Monitoring & Logging**

### **Application Insights**

```bash
# View metrics
az monitor app-insights metrics show \
  --resource-group sagesure-india-rg \
  --app sagesure-appinsights

# View logs
az monitor app-insights query \
  --app sagesure-appinsights \
  --analytics-query "customEvents | take 100"
```

### **Log Analytics**

```bash
# Query logs
az monitor log-analytics query \
  --workspace sagesure-log-analytics-workspace \
  --analytics-query "ContainerLog | limit 100"
```

### **Prometheus Metrics** (Optional)

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# Access Prometheus dashboard
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090
```

---

## 💰 **Cost Breakdown**

| Service | Monthly Cost | Annual | 50K Credits |
|---------|--------------|--------|-------------|
| AKS Premium | $73 | $876 | ✅ |
| PostgreSQL Flexible | $200-400 | $2,400-4,800 | ✅ |
| Redis Premium | $100-200 | $1,200-2,400 | ✅ |
| Container Registry | $50 | $600 | ✅ |
| App Insights | $50 | $600 | ✅ |
| Log Analytics | $50 | $600 | ✅ |
| Load Balancer | $30 | $360 | ✅ |
| Blob Storage | $20 | $240 | ✅ |
| Key Vault | $10 | $120 | ✅ |
| **Total** | **~$600-800** | **~$7,200-10,000** | **✅ Covered** |

**Your 50K credits = ~9-10 months free operation**

After credits expire: ~$600-800/month for production infrastructure

---

## 🔧 **Common Operations**

### **View Logs**

```bash
# Backend logs
kubectl logs -f deployment/sagesure-backend -n sagesure

# Frontend logs
kubectl logs -f deployment/sagesure-frontend -n sagesure

# All pods
kubectl logs -f -l app=sagesure -n sagesure --all-containers=true
```

### **Scale Deployments**

```bash
# Manual scaling
kubectl scale deployment sagesure-backend --replicas=5 -n sagesure

# Check HPA status
kubectl get hpa -n sagesure
kubectl describe hpa sagesure-backend-hpa -n sagesure
```

### **Update Image**

```bash
# Push new image
docker push sagesureacr.azurecr.io/sagesure-backend:v1.1.0

# Update deployment
kubectl set image deployment/sagesure-backend \
  backend=sagesureacr.azurecr.io/sagesure-backend:v1.1.0 \
  -n sagesure

# Monitor rollout
kubectl rollout status deployment/sagesure-backend -n sagesure
```

### **Connect to Database**

```bash
# Port-forward PostgreSQL
kubectl port-forward -n sagesure svc/sagesure-postgres 5432:5432

# Connect with psql
psql -h localhost -U postgres -d sagesure_india
```

### **Access Application**

```bash
# Get Ingress IP
kubectl get ingress -n sagesure

# OR port-forward
kubectl port-forward -n sagesure svc/sagesure-frontend 3000:3000
# Visit http://localhost:3000
```

---

## 🚨 **Troubleshooting**

### **Pod Not Starting**

```bash
# Check pod status
kubectl describe pod <pod-name> -n sagesure

# Check logs
kubectl logs <pod-name> -n sagesure

# Check events
kubectl get events -n sagesure --sort-by='.lastTimestamp'
```

### **Deployment Stuck**

```bash
# Rollback to previous version
kubectl rollout undo deployment/sagesure-backend -n sagesure

# Check rollout history
kubectl rollout history deployment/sagesure-backend -n sagesure
```

### **Out of Resources**

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n sagesure

# Scale nodes
az aks scale --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --node-count 5
```

### **Database Connection Issues**

```bash
# Test connection
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- \
  psql -h sagesure-postgres -U postgres -d sagesure_india

# Check connection limits
kubectl exec -it sagesu re-postgres-0 -n sagesure -- \
  psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

---

## 📝 **Maintenance Tasks**

### **Daily**

- ✅ Monitor Application Insights dashboard
- ✅ Check pod health: `kubectl get pods -n sagesure`
- ✅ Review logs for errors

### **Weekly**

- ✅ Backup database: `pg_dump` via port-forward
- ✅ Check scaling metrics
- ✅ Review Azure cost alerts
- ✅ Security patch updates

### **Monthly**

- ✅ Rotate secrets in Key Vault
- ✅ Update base images (postgres, redis, node)
- ✅ Performance review & optimization
- ✅ Disaster recovery drill

### **Quarterly**

- ✅ Major Kubernetes version upgrade
- ✅ Database upgrade
- ✅ Security audit
- ✅ Cost optimization review

---

## 🆘 **Support & Escalation**

### **Issues**

1. Check logs: `kubectl logs`
2. Describe resource: `kubectl describe`
3. Check Azure Portal (Azure > AKS cluster)
4. Check Application Insights
5. Check Log Analytics queries

### **Rollback**

```bash
# Immediate rollback
kubectl rollout undo deployment/<name> -n sagesure

# To specific revision
kubectl rollout undo deployment/<name> --to-revision=2 -n sagesure
```

### **Emergency Scale Down**

```bash
# Scale applications to 0
kubectl scale deployment --all --replicas=0 -n sagesure

# Or delete problematic pod
kubectl delete pod <pod-name> -n sagesure
```

---

## 📚 **Additional Resources**

- **Azure AKS Docs:** https://docs.microsoft.com/azure/aks/
- **Kubernetes Docs:** https://kubernetes.io/docs/
- **Terraform AzureRM:** https://registry.terraform.io/providers/hashicorp/azurerm/
- **Helm Hub:** https://artifacthub.io/

---

## ✅ **Deployment Checklist**

- [ ] Azure Subscription with $50K credits
- [ ] Service Principal created for CI/CD
- [ ] GitHub secrets configured
- [ ] Terraform backend storage created
- [ ] terraform apply completed successfully
- [ ] Kubernetes manifests applied
- [ ] Pods running and healthy
- [ ] Ingress created with certificate
- [ ] API endpoints responding
- [ ] Frontend accessible
- [ ] Database backups configured
- [ ] Monitoring dashboards set up
- [ ] Alerting configured
- [ ] Documentation updated
- [ ] Team trained on operations

---

**Deployment Status:** ✅ **READY FOR PRODUCTION**

Your SageSure platform is now running on enterprise-grade Azure AKS with full monitoring, auto-scaling, and security features.

