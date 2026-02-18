# Manual Azure Setup Guide - Simplified Approach

## Why Manual Setup?

Terraform is hitting permission and configuration issues. Creating resources through Azure Portal is faster and avoids these problems. We'll create the essential infrastructure manually, then deploy the application.

---

## Step 1: Create AKS Cluster (Azure Portal)

1. Go to Azure Portal: https://portal.azure.com
2. Search for "Kubernetes services" and click "Create"
3. Fill in the details:

**Basics Tab:**
- Subscription: Microsoft Azure Sponsorship
- Resource Group: Create new → `sagesure-india-rg`
- Cluster name: `sagesure-aks-prod`
- Region: `Central India`
- Kubernetes version: `1.32.10` (or latest stable)
- Node size: `Standard_D4s_v3` (4 vCPU, 16GB RAM)
- Node count: `3`

**Node pools Tab:**
- Enable autoscaling: Yes
- Min nodes: 2
- Max nodes: 10

**Networking Tab:**
- Network configuration: Azure CNI
- Leave other defaults

**Integrations Tab:**
- Container registry: Create new → `sagesureindiaacr`
- Enable monitoring: Yes

Click **Review + Create** → **Create**

⏱️ Takes 10-15 minutes

---

## Step 2: Create PostgreSQL Database

1. Search for "Azure Database for PostgreSQL flexible servers"
2. Click "Create"

**Basics:**
- Resource group: `sagesure-india-rg`
- Server name: `sagesure-india-postgres`
- Region: `Central India`
- PostgreSQL version: `15`
- Workload type: Production
- Compute + storage: 
  - Compute: General Purpose, 4 vCores
  - Storage: 128 GB

**Authentication:**
- Username: `sagesure_admin`
- Password: `SageSure2024!SecureDB#India`

**Networking:**
- Connectivity: Private access (VNet integration)
- Create new VNet or use AKS VNet

Click **Review + Create** → **Create**

⏱️ Takes 5-10 minutes

---

## Step 3: Create Redis Cache

1. Search for "Azure Cache for Redis"
2. Click "Create"

**Basics:**
- Resource group: `sagesure-india-rg`
- DNS name: `sagesure-india-redis`
- Location: `Central India`
- Cache type: `Standard C1` (1 GB)

**Advanced:**
- Enable non-SSL port: No
- Minimum TLS version: 1.2

Click **Review + Create** → **Create**

⏱️ Takes 5-10 minutes

---

## Step 4: Create Storage Account

1. Search for "Storage accounts"
2. Click "Create"

**Basics:**
- Resource group: `sagesure-india-rg`
- Storage account name: `sagesureindiadocs`
- Region: `Central India`
- Performance: Standard
- Redundancy: Geo-redundant storage (GRS)

**Advanced:**
- Enable blob versioning: Yes
- Enable soft delete: Yes (30 days)

**Networking:**
- Public network access: Enabled from all networks (can restrict later)

Click **Review + Create** → **Create**

After creation, create these containers:
- Go to Storage account → Containers → Add container
- Create: `policies`, `claims`, `vault`, `scam-evidence`

⏱️ Takes 2-3 minutes

---

## Step 5: Create Key Vault

1. Search for "Key vaults"
2. Click "Create"

**Basics:**
- Resource group: `sagesure-india-rg`
- Key vault name: `sagesure-india-kv`
- Region: `Central India`
- Pricing tier: `Standard` (Premium if you need HSM)

**Access configuration:**
- Permission model: Vault access policy
- Add your user account with all permissions

**Networking:**
- Public network access: Enabled (can restrict later)

Click **Review + Create** → **Create**

⏱️ Takes 2-3 minutes

---

## Step 6: Get Connection Strings

After all resources are created, collect the connection strings:

### PostgreSQL:
```
Server: sagesure-india-postgres.postgres.database.azure.com
Database: postgres (create 'sagesure_india' database)
Username: sagesure_admin
Password: SageSure2024!SecureDB#India

Connection string:
postgresql://sagesure_admin:SageSure2024!SecureDB#India@sagesure-india-postgres.postgres.database.azure.com:5432/sagesure_india?sslmode=require
```

### Redis:
- Go to Redis → Access keys
- Copy "Primary connection string"

### Storage:
- Go to Storage account → Access keys
- Copy "Connection string"

### ACR:
- Go to Container Registry → Access keys
- Enable "Admin user"
- Copy username and password

---

## Step 7: Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod

# Verify
kubectl get nodes
```

---

## Step 8: Create Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace sagesure-india

# Generate JWT keys
cd packages/backend
npm run generate-keys

# Create secrets
kubectl create secret generic sagesure-secrets \
  --namespace=sagesure-india \
  --from-literal=database-url="postgresql://sagesure_admin:SageSure2024!SecureDB#India@sagesure-india-postgres.postgres.database.azure.com:5432/sagesure_india?sslmode=require" \
  --from-literal=redis-url="<REDIS_CONNECTION_STRING>" \
  --from-literal=azure-storage-connection="<STORAGE_CONNECTION_STRING>" \
  --from-file=jwt-public-key=./keys/public.key \
  --from-file=jwt-private-key=./keys/private.key \
  --from-literal=jwt-secret="$(openssl rand -base64 32)"
```

---

## Step 9: Configure GitHub Secrets

Add these to GitHub repository secrets:

1. **AZURE_CREDENTIALS**: (Already have this)
2. **ACR_USERNAME**: From Container Registry
3. **ACR_PASSWORD**: From Container Registry  
4. **DATABASE_URL**: PostgreSQL connection string

---

## Step 10: Deploy Application

```bash
# Push to trigger CI/CD
git add .
git commit -m "Deploy to Azure"
git push origin main
```

Monitor deployment at: https://github.com/MapleSage/sagesure_app/actions

---

## Estimated Time

- AKS Cluster: 10-15 minutes
- PostgreSQL: 5-10 minutes
- Redis: 5-10 minutes
- Storage: 2-3 minutes
- Key Vault: 2-3 minutes
- Configuration: 10 minutes

**Total: ~35-50 minutes**

---

## Benefits of Manual Setup

✅ No Terraform permission issues
✅ Visual interface - easier to understand
✅ Faster troubleshooting
✅ Can see resources being created in real-time
✅ Azure Portal validates configurations automatically

---

## Next Steps After Manual Setup

Once resources are created:
1. Get all connection strings
2. Configure kubectl
3. Create Kubernetes secrets
4. Add GitHub secrets
5. Push code to trigger deployment

Would you like to proceed with this approach?
