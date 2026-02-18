# SageSure India Platform - Deployment Guide

## Overview

This guide walks you through deploying the SageSure India Platform to Azure Kubernetes Service (AKS) using the automated CI/CD pipeline.

## Prerequisites

- Azure subscription with appropriate permissions
- GitHub account
- Azure CLI installed locally
- kubectl installed locally
- Terraform installed locally (v1.5+)
- Node.js 18+ installed locally

## Architecture

```
GitHub → GitHub Actions → Docker Build → GitHub Container Registry → Azure AKS
                ↓
         Run Tests & Security Scans
```

## Step 1: Azure Service Principal Setup

Create a service principal for GitHub Actions to deploy to Azure:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac \
  --name "sagesure-india-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth

# Save the JSON output - you'll need it for GitHub secrets
```

## Step 2: GitHub Repository Setup

### 2.1 Create GitHub Repository

```bash
# Create a new repository on GitHub (via web UI or CLI)
# Then connect your local repository:

git remote add origin https://github.com/YOUR_ORG/sagesure-india.git
git branch -M main
```

### 2.2 Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `AZURE_CREDENTIALS` | Service principal JSON from Step 1 | Yes |
| `SLACK_WEBHOOK` | Slack webhook URL for deployment notifications | No |

## Step 3: Deploy Azure Infrastructure

### 3.1 Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy the example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars
```

Required variables:
```hcl
project_name        = "sagesure-india"
environment         = "production"
location            = "centralindia"
aks_node_count      = 3
aks_node_size       = "Standard_D4s_v3"
postgres_sku        = "GP_Standard_D4s_v3"
postgres_storage_gb = 100
redis_sku           = "Standard"
redis_capacity      = 1
```

### 3.2 Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the infrastructure
terraform apply

# Save the outputs
terraform output > ../../terraform-outputs.txt
```

This will create:
- Azure Kubernetes Service (AKS) cluster
- PostgreSQL 15 Flexible Server
- Azure Cache for Redis
- Azure Blob Storage
- Azure Key Vault
- Application Insights
- Log Analytics Workspace
- Network Security Groups
- Virtual Network

### 3.3 Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-india-aks

# Verify connection
kubectl get nodes
```

## Step 4: Configure Kubernetes Secrets

### 4.1 Create Namespace

```bash
kubectl apply -f infrastructure/kubernetes/namespace.yaml
```

### 4.2 Create Secrets

```bash
# Get connection strings from Terraform outputs
POSTGRES_URL=$(terraform output -raw postgres_connection_string)
REDIS_URL=$(terraform output -raw redis_connection_string)
STORAGE_CONNECTION=$(terraform output -raw storage_connection_string)

# Generate JWT keys
cd packages/backend
npm run generate-keys

# Create Kubernetes secret
kubectl create secret generic sagesure-secrets \
  --namespace=sagesure-india \
  --from-literal=database-url="$POSTGRES_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=azure-storage-connection="$STORAGE_CONNECTION" \
  --from-file=jwt-public-key=./keys/public.key \
  --from-file=jwt-private-key=./keys/private.key \
  --from-literal=jwt-secret="$(openssl rand -base64 32)"
```

### 4.3 Configure Azure Communication Services (Optional)

If using Azure Communication Services for SMS/Email:

```bash
# Get connection string from Azure Portal
ACS_CONNECTION=$(az communication show \
  --name sagesure-india-acs \
  --resource-group sagesure-india-rg \
  --query primaryConnectionString -o tsv)

# Update secret
kubectl patch secret sagesure-secrets \
  --namespace=sagesure-india \
  --type=merge \
  -p "{\"data\":{\"azure-communication-connection\":\"$(echo -n $ACS_CONNECTION | base64)\"}}"
```

## Step 5: Deploy Application via CI/CD

### 5.1 Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial deployment: SageSure India Platform"

# Push to main branch (triggers CI/CD)
git push -u origin main
```

### 5.2 Monitor Deployment

1. Go to GitHub → Actions tab
2. Watch the CI/CD pipeline execute:
   - Backend CI (tests, build)
   - Frontend CI (tests, build)
   - Security scan
   - Docker build & push
   - Azure deployment
   - Database migrations
   - Health checks

### 5.3 Verify Deployment

```bash
# Check pod status
kubectl get pods -n sagesure-india

# Check deployment status
kubectl rollout status deployment/sagesure-backend -n sagesure-india

# Check logs
kubectl logs -f deployment/sagesure-backend -n sagesure-india

# Check service
kubectl get svc -n sagesure-india
```

## Step 6: Configure DNS and SSL

### 6.1 Get Ingress IP

```bash
kubectl get ingress -n sagesure-india
```

### 6.2 Configure DNS

Add an A record in your DNS provider:
```
api.sagesure-india.com → [INGRESS_IP]
```

### 6.3 SSL Certificate

The ingress controller automatically provisions SSL certificates via Let's Encrypt using cert-manager.

Verify certificate:
```bash
kubectl get certificate -n sagesure-india
```

## Step 7: Run Database Migrations

Migrations run automatically via init container, but you can run manually if needed:

```bash
kubectl exec -it deployment/sagesure-backend -n sagesure-india -- \
  npx prisma migrate deploy
```

## Step 8: Seed Database

```bash
kubectl exec -it deployment/sagesure-backend -n sagesure-india -- \
  npx prisma db seed
```

## Step 9: Verify API

```bash
# Health check
curl https://api.sagesure-india.com/health

# API health
curl https://api.sagesure-india.com/api/v1/health
```

## Step 10: Configure Monitoring

### 10.1 Application Insights

Application Insights is automatically configured. View metrics in Azure Portal:
- Go to Application Insights resource
- View Live Metrics, Performance, Failures

### 10.2 Log Analytics

View logs in Azure Portal:
- Go to Log Analytics Workspace
- Run queries on container logs

### 10.3 Alerts

Configure alerts in Azure Monitor:
- API response time > 3s
- Error rate > 5%
- CPU usage > 80%
- Memory usage > 85%

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous version
kubectl rollout undo deployment/sagesure-backend -n sagesure-india

# Check rollback status
kubectl rollout status deployment/sagesure-backend -n sagesure-india
```

## Scaling

### Manual Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment/sagesure-backend -n sagesure-india --replicas=5
```

### Auto-scaling

HorizontalPodAutoscaler is already configured (3-10 pods based on CPU/memory).

View autoscaler status:
```bash
kubectl get hpa -n sagesure-india
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n sagesure-india

# Check logs
kubectl logs <pod-name> -n sagesure-india

# Check secrets
kubectl get secret sagesure-secrets -n sagesure-india -o yaml
```

### Database connection issues

```bash
# Test database connection
kubectl exec -it deployment/sagesure-backend -n sagesure-india -- \
  npx prisma db execute --stdin <<< "SELECT 1"
```

### SSL certificate issues

```bash
# Check certificate status
kubectl describe certificate -n sagesure-india

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

## Maintenance

### Update Application

Push changes to main branch - CI/CD will automatically deploy.

### Update Infrastructure

```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

### Backup Database

Automated backups run every 6 hours. Manual backup:

```bash
az postgres flexible-server backup create \
  --resource-group sagesure-india-rg \
  --name sagesure-india-postgres \
  --backup-name manual-backup-$(date +%Y%m%d)
```

### Restore Database

```bash
az postgres flexible-server restore \
  --resource-group sagesure-india-rg \
  --name sagesure-india-postgres-restored \
  --source-server sagesure-india-postgres \
  --restore-time "2024-02-18T10:00:00Z"
```

## Security Checklist

- [ ] Azure service principal has minimum required permissions
- [ ] Kubernetes secrets are properly configured
- [ ] SSL certificates are valid
- [ ] Network policies are applied
- [ ] RBAC is configured
- [ ] Pod security standards are enforced
- [ ] Azure Key Vault is configured
- [ ] Audit logging is enabled
- [ ] Monitoring and alerting are configured
- [ ] Backup and restore procedures are tested

## Support

For issues or questions:
- Email: devops@sagesure-india.com
- Slack: #sagesure-india-ops
- On-call: PagerDuty rotation

## References

- [Azure AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
