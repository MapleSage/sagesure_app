# Azure Managed Services - Deployment Guide

This document provides detailed information about the Azure managed services provisioned for the SageSure India Platform.

## Overview

Task 2.2 provisions the following Azure managed services:

1. **PostgreSQL 15 Flexible Server** - Primary database (100GB storage)
2. **Azure Cache for Redis** - Caching layer (1GB)
3. **Azure Blob Storage** - Document storage with encryption
4. **Azure Key Vault** - Secrets and encryption key management
5. **Application Insights** - Application performance monitoring
6. **Log Analytics Workspace** - Centralized logging (created in Task 2.1)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AKS Cluster                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Application Pods                                     │   │
│  │  - Connect to PostgreSQL via private endpoint        │   │
│  │  - Connect to Redis via private endpoint             │   │
│  │  - Access Blob Storage via service endpoint          │   │
│  │  - Retrieve secrets from Key Vault                   │   │
│  │  - Send telemetry to Application Insights            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure Managed Services (Private)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │    Redis     │  │  Blob Storage│     │
│  │   15 DB      │  │   1GB Cache  │  │  GRS + Ver.  │     │
│  │ 100GB + HA   │  │   TLS 1.2    │  │  AES-256     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Key Vault   │  │ App Insights │  │Log Analytics │     │
│  │  Premium     │  │  Monitoring  │  │  Workspace   │     │
│  │  HSM Keys    │  │  90d Retain  │  │  30d Retain  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Service Details

### 1. PostgreSQL 15 Flexible Server

**Configuration:**
- **Version**: PostgreSQL 15
- **SKU**: GP_Standard_D4s_v3 (4 vCores, 16GB RAM)
- **Storage**: 100GB with auto-grow disabled
- **Backup**: 7-day retention, geo-redundant enabled
- **High Availability**: Zone-redundant with standby in Zone 2
- **Network**: Private endpoint via delegated subnet
- **Maintenance Window**: Sunday 2:00-5:00 AM

**Performance Tuning:**
- `max_connections`: 500
- `shared_buffers`: 4GB

**Database:**
- Name: `sagesure_india`
- Charset: UTF8
- Collation: en_US.utf8

**Security:**
- Private DNS zone: `privatelink.postgres.database.azure.com`
- No public access
- TLS 1.2+ required
- Connection string stored in Key Vault

**Connection String Format:**
```
postgresql://[username]:[password]@[server].postgres.database.azure.com:5432/sagesure_india?sslmode=require
```

### 2. Azure Cache for Redis

**Configuration:**
- **SKU**: Standard C1 (1GB)
- **TLS**: Minimum version 1.2
- **Non-SSL Port**: Disabled
- **Eviction Policy**: allkeys-lru
- **Memory Reserved**: 50MB for maxmemory and maxfragmentationmemory

**Security:**
- No public access
- TLS-only connections
- Connection string stored in Key Vault

**Connection String Format:**
```
rediss://:[access_key]@[hostname]:6380
```

**Use Cases:**
- Session storage
- API response caching
- Rate limiting counters
- Temporary data storage

### 3. Azure Blob Storage

**Configuration:**
- **Account Type**: StorageV2
- **Tier**: Standard
- **Replication**: GRS (Geo-Redundant Storage)
- **TLS**: Minimum version 1.2
- **HTTPS Only**: Enabled
- **Public Access**: Disabled

**Features:**
- Blob versioning enabled
- Soft delete: 30 days retention
- Container soft delete: 30 days retention

**Containers:**
1. **policies** - Insurance policy documents
2. **claims** - Claim-related documents
3. **vault** - Sovereign Vault encrypted documents
4. **scam-evidence** - ScamShield evidence files

**Network Security:**
- Default action: Deny
- Allowed: Azure Services + AKS subnet
- AKS has "Storage Blob Data Contributor" role

**Encryption:**
- At-rest: AES-256 (Microsoft-managed keys)
- In-transit: TLS 1.2+
- Document-level encryption: Application-managed via Key Vault

### 4. Azure Key Vault

**Configuration:**
- **SKU**: Premium (HSM-backed keys)
- **Soft Delete**: 90 days retention
- **Purge Protection**: Enabled
- **Network**: Private access from AKS subnet only

**Access Policies:**

1. **AKS Cluster Identity:**
   - Keys: Get, List, Encrypt, Decrypt, WrapKey, UnwrapKey
   - Secrets: Get, List

2. **Terraform Service Principal:**
   - Keys: Full management permissions
   - Secrets: Full management permissions
   - Certificates: Full management permissions

**Stored Secrets:**
- `postgres-connection-string` - PostgreSQL connection string
- `redis-connection-string` - Redis connection string
- `storage-connection-string` - Blob Storage connection string
- `appinsights-instrumentation-key` - Application Insights key
- `appinsights-connection-string` - Application Insights connection

**Encryption Keys:**
- `document-encryption-key` - RSA-HSM 4096-bit key for document encryption

**Key Operations:**
- Encrypt/Decrypt documents
- Wrap/Unwrap data encryption keys
- All operations performed server-side (keys never leave Key Vault)

### 5. Application Insights

**Configuration:**
- **Type**: Web application
- **Workspace**: Linked to Log Analytics workspace
- **Retention**: 90 days
- **Sampling**: Adaptive (configurable in application)

**Monitoring Capabilities:**
- Request/response tracking
- Dependency tracking (DB, Redis, external APIs)
- Exception logging
- Custom events and metrics
- Performance counters
- Availability tests

**Integration:**
- Connection string stored in Key Vault
- Application retrieves at startup
- Automatic telemetry collection via SDK

### 6. Log Analytics Workspace

**Configuration:**
- **SKU**: PerGB2018 (pay-as-you-go)
- **Retention**: 30 days
- **Created in**: Task 2.1

**Data Sources:**
- AKS cluster logs
- Application Insights telemetry
- Azure resource diagnostics
- Custom application logs

## Deployment

### Prerequisites

1. Completed Task 2.1 (AKS cluster and Log Analytics workspace)
2. Azure CLI authenticated
3. Terraform initialized

### Deploy Managed Services

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Set PostgreSQL password (do not commit this!)
export TF_VAR_postgres_admin_password="YourStrongPassword123!"

# Plan deployment
terraform plan -out=tfplan

# Review the plan - should show:
# - 1 PostgreSQL Flexible Server
# - 1 PostgreSQL Database
# - 2 PostgreSQL Configurations
# - 1 Private DNS Zone
# - 1 DNS Zone VNet Link
# - 1 Redis Cache
# - 1 Storage Account
# - 4 Storage Containers
# - 1 Key Vault
# - 2 Key Vault Access Policies
# - 1 Key Vault Key
# - 5 Key Vault Secrets
# - 1 Application Insights
# - 1 Role Assignment

# Apply configuration
terraform apply tfplan
```

**Deployment Time**: 15-20 minutes

### Verify Deployment

```bash
# View all managed services
terraform output managed_services_summary

# Test PostgreSQL connection
POSTGRES_CONN=$(az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name postgres-connection-string \
  --query value -o tsv)

psql "$POSTGRES_CONN" -c "SELECT version();"

# Test Redis connection
REDIS_CONN=$(az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name redis-connection-string \
  --query value -o tsv)

redis-cli -u "$REDIS_CONN" PING

# List blob containers
az storage container list \
  --account-name $(terraform output -raw storage_account_name) \
  --auth-mode login
```

## Application Integration

### Accessing Secrets from Kubernetes

**Option 1: Azure Key Vault Provider for Secrets Store CSI Driver**

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<kubelet-identity-client-id>"
    keyvaultName: "<key-vault-name>"
    objects: |
      array:
        - |
          objectName: postgres-connection-string
          objectType: secret
        - |
          objectName: redis-connection-string
          objectType: secret
    tenantId: "<tenant-id>"
```

**Option 2: Environment Variables (Less Secure)**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: app:latest
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: connection-string
```

### Connection Examples

**Node.js/TypeScript:**

```typescript
import { Client } from 'pg';
import { createClient } from 'redis';
import { BlobServiceClient } from '@azure/storage-blob';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

// Get secrets from Key Vault
const credential = new DefaultAzureCredential();
const keyVaultUrl = process.env.KEY_VAULT_URL;
const secretClient = new SecretClient(keyVaultUrl, credential);

// PostgreSQL
const pgConnString = await secretClient.getSecret('postgres-connection-string');
const pgClient = new Client({ connectionString: pgConnString.value });
await pgClient.connect();

// Redis
const redisConnString = await secretClient.getSecret('redis-connection-string');
const redisClient = createClient({ url: redisConnString.value });
await redisClient.connect();

// Blob Storage
const storageConnString = await secretClient.getSecret('storage-connection-string');
const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnString.value);
const containerClient = blobServiceClient.getContainerClient('policies');

// Application Insights
const appInsightsConnString = await secretClient.getSecret('appinsights-connection-string');
// Configure Application Insights SDK with connection string
```

## Security Best Practices

### 1. Network Security

- All services use private endpoints or service endpoints
- No public access enabled
- Network Security Groups restrict traffic
- TLS 1.2+ enforced for all connections

### 2. Access Control

- Use Managed Identities (no passwords in code)
- Principle of least privilege for access policies
- Regular access review and rotation
- Audit all access attempts

### 3. Encryption

- Data at rest: AES-256 encryption
- Data in transit: TLS 1.2+
- Document-level encryption with Key Vault
- Key rotation every 90 days (recommended)

### 4. Monitoring

- Enable diagnostic logs for all services
- Set up alerts for:
  - Failed authentication attempts
  - Unusual access patterns
  - Resource utilization thresholds
  - Key Vault access anomalies

### 5. Backup and Recovery

- PostgreSQL: 7-day backup retention, geo-redundant
- Blob Storage: Versioning + 30-day soft delete
- Key Vault: 90-day soft delete + purge protection
- Test recovery procedures quarterly

## Monitoring and Alerts

### Key Metrics to Monitor

**PostgreSQL:**
- CPU utilization (alert > 80%)
- Memory utilization (alert > 85%)
- Storage utilization (alert > 80%)
- Connection count (alert > 400)
- Replication lag (alert > 60s)

**Redis:**
- Memory utilization (alert > 90%)
- CPU utilization (alert > 80%)
- Cache hit rate (alert < 80%)
- Connected clients (alert > 900)

**Blob Storage:**
- Availability (alert < 99.9%)
- Latency (alert > 1000ms)
- Throttling errors (alert > 0)

**Key Vault:**
- Failed access attempts (alert > 5/hour)
- Key operations latency (alert > 500ms)
- Availability (alert < 99.9%)

### Setting Up Alerts

```bash
# Example: PostgreSQL CPU alert
az monitor metrics alert create \
  --name "postgres-high-cpu" \
  --resource-group sagesure-india-rg \
  --scopes $(terraform output -raw postgres_server_id) \
  --condition "avg cpu_percent > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group <action-group-id>
```

## Cost Optimization

### Current Monthly Costs (Estimate)

- PostgreSQL GP_Standard_D4s_v3: ~$180
- Redis Standard C1: ~$25
- Blob Storage (100GB GRS): ~$5
- Key Vault Premium: ~$5
- Application Insights: ~$50
- **Total**: ~$265/month

### Optimization Strategies

1. **PostgreSQL:**
   - Use reserved capacity for 1-year (save 38%)
   - Scale down to D2s_v3 for dev/staging
   - Disable geo-redundant backup for non-prod

2. **Redis:**
   - Use Basic tier for dev/staging (save 50%)
   - Consider Azure Cache for Redis Enterprise for production

3. **Blob Storage:**
   - Use lifecycle policies to move old data to Cool/Archive tier
   - Use LRS instead of GRS for non-critical data

4. **Application Insights:**
   - Configure sampling to reduce data ingestion
   - Set daily cap to prevent unexpected costs

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check server status
az postgres flexible-server show \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw postgres_server_name)

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw postgres_server_name)

# Test DNS resolution
nslookup $(terraform output -raw postgres_server_fqdn)

# Check logs
az postgres flexible-server logs list \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw postgres_server_name)
```

### Redis Connection Issues

```bash
# Check Redis status
az redis show \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw redis_hostname | cut -d. -f1)

# Test connection
redis-cli -h $(terraform output -raw redis_hostname) \
  -p $(terraform output -raw redis_ssl_port) \
  --tls \
  -a $(terraform output -raw redis_primary_access_key) \
  PING
```

### Key Vault Access Issues

```bash
# Check access policies
az keyvault show \
  --name $(terraform output -raw key_vault_name) \
  --query properties.accessPolicies

# Test secret retrieval
az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name postgres-connection-string
```

## Maintenance

### Regular Tasks

**Weekly:**
- Review Application Insights for errors and performance issues
- Check resource utilization metrics

**Monthly:**
- Review and optimize costs
- Update PostgreSQL statistics
- Review Key Vault access logs
- Test backup restoration

**Quarterly:**
- Rotate encryption keys
- Review and update access policies
- Performance tuning based on metrics
- Disaster recovery drill

### Backup and Restore

**PostgreSQL Backup:**
```bash
# Manual backup
az postgres flexible-server backup create \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw postgres_server_name) \
  --backup-name manual-backup-$(date +%Y%m%d)

# List backups
az postgres flexible-server backup list \
  --resource-group sagesure-india-rg \
  --name $(terraform output -raw postgres_server_name)
```

**PostgreSQL Restore:**
```bash
# Restore to new server
az postgres flexible-server restore \
  --resource-group sagesure-india-rg \
  --name sagesure-postgres-restored \
  --source-server $(terraform output -raw postgres_server_name) \
  --restore-time "2024-01-15T10:00:00Z"
```

## Requirements Mapping

This configuration satisfies:

- **Requirement 2.4**: Data encryption and security
  - PostgreSQL with TLS and database-level encryption
  - Key Vault for secrets and encryption keys
  - Blob Storage with AES-256 encryption
  
- **Requirement 13.2**: Encrypted document storage
  - Blob Storage with versioning and soft delete
  - Geo-redundant storage for disaster recovery
  - Document-level encryption via Key Vault

## Next Steps

1. Deploy application workloads to AKS
2. Configure application to use managed services
3. Set up monitoring alerts
4. Implement backup verification procedures
5. Document runbooks for common operations
6. Train team on operational procedures

## Support

For issues:
1. Check Azure Service Health: https://status.azure.com/
2. Review Application Insights for application errors
3. Check Log Analytics for infrastructure logs
4. Contact Azure Support for service-level issues
