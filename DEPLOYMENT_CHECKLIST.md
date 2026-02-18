# SageSure India Platform - Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Repository Setup
- [ ] Create GitHub repository: `sagesure-india`
- [ ] Add repository description and topics
- [ ] Configure branch protection rules for `main`
- [ ] Add team members with appropriate permissions

### 2. Local Git Setup
```bash
# Verify git is initialized
git status

# Add all files
git add .

# Create initial commit
git commit -m "Initial deployment: SageSure India Platform Phase 1

- Complete backend API with 16 endpoints
- Authentication with JWT and MFA
- ScamShield module (scam detection, phone verification, deepfake detection)
- Policy Pulse module (PDF parsing, red flag detection, coverage comparison)
- CI/CD pipeline with GitHub Actions
- Kubernetes deployment manifests
- Terraform infrastructure code
- Comprehensive documentation"

# Add remote
git remote add origin https://github.com/YOUR_ORG/sagesure-india.git

# Push to GitHub
git push -u origin main
```

### 3. GitHub Secrets Configuration
Navigate to: Repository → Settings → Secrets and variables → Actions

Add the following secrets:

#### Required Secrets
- [ ] `AZURE_CREDENTIALS` - Azure service principal JSON
  ```bash
  az ad sp create-for-rbac \
    --name "sagesure-india-github-actions" \
    --role contributor \
    --scopes /subscriptions/{subscription-id} \
    --sdk-auth
  ```

#### Optional Secrets
- [ ] `SLACK_WEBHOOK` - Slack webhook URL for deployment notifications

### 4. Azure Service Principal Setup
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create service principal
az ad sp create-for-rbac \
  --name "sagesure-india-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth

# Save the JSON output for GitHub secrets
```

### 5. Terraform Infrastructure Deployment

#### 5.1 Configure Variables
```bash
cd infrastructure/terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
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

#### 5.2 Deploy Infrastructure
```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Review plan
terraform plan

# Apply infrastructure
terraform apply

# Save outputs
terraform output > ../../terraform-outputs.txt
```

- [ ] Terraform initialized
- [ ] Infrastructure plan reviewed
- [ ] Infrastructure deployed successfully
- [ ] Outputs saved

### 6. Kubernetes Configuration

#### 6.1 Get AKS Credentials
```bash
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-india-aks

# Verify connection
kubectl get nodes
```

- [ ] kubectl configured
- [ ] Cluster accessible
- [ ] Nodes healthy

#### 6.2 Create Namespace
```bash
kubectl apply -f infrastructure/kubernetes/namespace.yaml
```

- [ ] Namespace created

#### 6.3 Generate JWT Keys
```bash
cd packages/backend

# Generate RSA key pair
npm run generate-keys

# Keys will be in ./keys/ directory
```

- [ ] JWT keys generated

#### 6.4 Create Kubernetes Secrets
```bash
# Get connection strings from Terraform outputs
POSTGRES_URL=$(cd infrastructure/terraform && terraform output -raw postgres_connection_string)
REDIS_URL=$(cd infrastructure/terraform && terraform output -raw redis_connection_string)
STORAGE_CONNECTION=$(cd infrastructure/terraform && terraform output -raw storage_connection_string)

# Create secret
kubectl create secret generic sagesure-secrets \
  --namespace=sagesure-india \
  --from-literal=database-url="$POSTGRES_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=azure-storage-connection="$STORAGE_CONNECTION" \
  --from-file=jwt-public-key=./packages/backend/keys/public.key \
  --from-file=jwt-private-key=./packages/backend/keys/private.key \
  --from-literal=jwt-secret="$(openssl rand -base64 32)"

# Verify secret created
kubectl get secret sagesure-secrets -n sagesure-india
```

- [ ] Secrets created
- [ ] Secrets verified

#### 6.5 Configure Azure Communication Services (Optional)
```bash
# Get connection string
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

- [ ] Azure Communication Services configured (if using)

### 7. Deploy Application

#### 7.1 Push to GitHub (Triggers CI/CD)
```bash
# Ensure all changes are committed
git status

# Push to main branch
git push origin main
```

- [ ] Code pushed to GitHub
- [ ] CI/CD pipeline triggered

#### 7.2 Monitor Deployment
1. Go to GitHub → Actions tab
2. Watch the pipeline execute:
   - [ ] Backend CI passed
   - [ ] Frontend CI passed
   - [ ] Security scan passed
   - [ ] Docker build passed
   - [ ] Azure deployment passed
   - [ ] Database migrations passed
   - [ ] Health checks passed

#### 7.3 Verify Deployment
```bash
# Check pod status
kubectl get pods -n sagesure-india

# Check deployment status
kubectl rollout status deployment/sagesure-backend -n sagesure-india

# Check logs
kubectl logs -f deployment/sagesure-backend -n sagesure-india --tail=100

# Check service
kubectl get svc -n sagesure-india

# Check ingress
kubectl get ingress -n sagesure-india
```

- [ ] Pods running (3/3)
- [ ] Deployment successful
- [ ] Logs show no errors
- [ ] Service created
- [ ] Ingress configured

### 8. Database Setup

#### 8.1 Run Migrations (Automated via init container)
Migrations run automatically, but verify:
```bash
kubectl logs -n sagesure-india \
  $(kubectl get pods -n sagesure-india -l app=sagesure-backend -o jsonpath='{.items[0].metadata.name}') \
  -c db-migrate
```

- [ ] Migrations completed successfully

#### 8.2 Seed Database
```bash
kubectl exec -it deployment/sagesure-backend -n sagesure-india -- \
  npx prisma db seed
```

- [ ] Database seeded with test data

### 9. DNS and SSL Configuration

#### 9.1 Get Ingress IP
```bash
kubectl get ingress -n sagesure-india -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'
```

- [ ] Ingress IP obtained: `_________________`

#### 9.2 Configure DNS
Add A record in your DNS provider:
```
api.sagesure-india.com → [INGRESS_IP]
```

- [ ] DNS A record created
- [ ] DNS propagation verified (may take 5-60 minutes)

#### 9.3 Verify SSL Certificate
```bash
# Check certificate status
kubectl get certificate -n sagesure-india

# Wait for certificate to be ready (may take 5-10 minutes)
kubectl describe certificate -n sagesure-india
```

- [ ] SSL certificate issued
- [ ] Certificate status: Ready

### 10. API Verification

#### 10.1 Health Checks
```bash
# Health endpoint
curl https://api.sagesure-india.com/health

# Expected: {"status":"ok","timestamp":"..."}

# API health endpoint
curl https://api.sagesure-india.com/api/v1/health

# Expected: {"status":"healthy","database":"connected","redis":"connected"}
```

- [ ] Health endpoint responding
- [ ] API health endpoint responding
- [ ] Database connected
- [ ] Redis connected

#### 10.2 Test Authentication
```bash
# Register a test user
curl -X POST https://api.sagesure-india.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "phone": "+919876543210",
    "role": "CONSUMER"
  }'

# Login
curl -X POST https://api.sagesure-india.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

- [ ] Registration working
- [ ] Login working
- [ ] JWT tokens received

#### 10.3 Test ScamShield
```bash
# Analyze message (requires auth token)
curl -X POST https://api.sagesure-india.com/api/v1/scamshield/analyze-message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Congratulations! You have won 10 lakh rupees. Click here to claim."
  }'
```

- [ ] Scam analysis working
- [ ] Risk score calculated

### 11. Monitoring Setup

#### 11.1 Application Insights
- [ ] Navigate to Azure Portal → Application Insights
- [ ] Verify metrics are being collected
- [ ] Check Live Metrics Stream
- [ ] Review Performance tab
- [ ] Review Failures tab

#### 11.2 Log Analytics
- [ ] Navigate to Azure Portal → Log Analytics Workspace
- [ ] Run sample query: `ContainerLog | where TimeGenerated > ago(1h)`
- [ ] Verify logs are being collected

#### 11.3 Configure Alerts
```bash
# Create alert for high error rate
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group sagesure-india-rg \
  --scopes /subscriptions/{subscription-id}/resourceGroups/sagesure-india-rg/providers/Microsoft.Insights/components/sagesure-india-appinsights \
  --condition "avg requests/failed > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group-ids /subscriptions/{subscription-id}/resourceGroups/sagesure-india-rg/providers/microsoft.insights/actionGroups/sagesure-alerts
```

- [ ] Error rate alert configured
- [ ] Response time alert configured
- [ ] CPU usage alert configured
- [ ] Memory usage alert configured

### 12. Backup Verification

#### 12.1 Verify Automated Backups
```bash
# Check PostgreSQL backups
az postgres flexible-server backup list \
  --resource-group sagesure-india-rg \
  --name sagesure-india-postgres
```

- [ ] Automated backups configured
- [ ] Backup retention set to 30 days

#### 12.2 Test Backup Restoration
```bash
# Create test backup
az postgres flexible-server backup create \
  --resource-group sagesure-india-rg \
  --name sagesure-india-postgres \
  --backup-name test-backup-$(date +%Y%m%d)

# Test restore (to new server)
az postgres flexible-server restore \
  --resource-group sagesure-india-rg \
  --name sagesure-india-postgres-test \
  --source-server sagesure-india-postgres \
  --restore-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

- [ ] Test backup created
- [ ] Test restore successful
- [ ] Test server deleted after verification

### 13. Security Audit

#### 13.1 Verify Security Settings
- [ ] Pods running as non-root user
- [ ] Read-only root filesystem enabled
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Secrets stored in Azure Key Vault
- [ ] TLS 1.3 enforced
- [ ] Rate limiting active

#### 13.2 Run Security Scan
```bash
# Trivy scan (already runs in CI/CD)
# Review results in GitHub Actions → Security tab
```

- [ ] No critical vulnerabilities
- [ ] No high vulnerabilities (or documented exceptions)

### 14. Performance Testing

#### 14.1 Load Testing
```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Run load test
k6 run tests/load/api-load-test.js
```

- [ ] API handles 1000 concurrent users
- [ ] 95% of requests < 2s
- [ ] No errors under load
- [ ] Auto-scaling working

### 15. Documentation Review

- [ ] README.md updated with production URLs
- [ ] API_ARCHITECTURE.md reviewed
- [ ] DEPLOYMENT_GUIDE.md followed successfully
- [ ] All task implementation docs complete
- [ ] PHASE_1_COMPLETE.md reviewed

### 16. Team Handoff

#### 16.1 Access Provisioning
- [ ] Team members added to GitHub repository
- [ ] Team members added to Azure subscription
- [ ] Team members added to Slack channels
- [ ] On-call rotation configured

#### 16.2 Training
- [ ] Deployment process walkthrough
- [ ] Monitoring and alerting review
- [ ] Incident response procedures
- [ ] Rollback procedures

### 17. Go-Live Checklist

- [ ] All pre-deployment tasks complete
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backups verified
- [ ] Security audit passed
- [ ] Performance testing passed
- [ ] Documentation complete
- [ ] Team trained
- [ ] Stakeholders notified

### 18. Post-Deployment

#### 18.1 Immediate (First 24 hours)
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor resource usage
- [ ] Review logs for issues
- [ ] Verify all endpoints working

#### 18.2 First Week
- [ ] Review Application Insights metrics
- [ ] Analyze user behavior
- [ ] Identify performance bottlenecks
- [ ] Plan optimizations
- [ ] Gather user feedback

#### 18.3 First Month
- [ ] Review backup and restore procedures
- [ ] Conduct disaster recovery drill
- [ ] Review and update documentation
- [ ] Plan Phase 2 features
- [ ] Optimize based on usage patterns

---

## Rollback Procedure

If deployment fails or critical issues are discovered:

```bash
# Rollback to previous version
kubectl rollout undo deployment/sagesure-backend -n sagesure-india

# Check rollback status
kubectl rollout status deployment/sagesure-backend -n sagesure-india

# Verify health
curl https://api.sagesure-india.com/health
```

---

## Support Contacts

- **DevOps Lead**: devops@sagesure-india.com
- **Backend Lead**: backend@sagesure-india.com
- **Security Lead**: security@sagesure-india.com
- **On-Call**: PagerDuty rotation
- **Slack**: #sagesure-india-ops

---

## Sign-Off

### Deployment Team
- [ ] DevOps Engineer: _________________ Date: _______
- [ ] Backend Engineer: _________________ Date: _______
- [ ] QA Engineer: _________________ Date: _______
- [ ] Security Engineer: _________________ Date: _______

### Stakeholders
- [ ] Product Manager: _________________ Date: _______
- [ ] Engineering Manager: _________________ Date: _______
- [ ] CTO: _________________ Date: _______

---

**Deployment Status**: ⏳ Pending  
**Target Go-Live Date**: _________________  
**Actual Go-Live Date**: _________________
