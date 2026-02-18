# Networking and Security Overview

## Architecture Overview

The SageSure India Platform implements a defense-in-depth security strategy with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Azure Front    │
                    │  Door / WAF     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  NGINX Ingress  │
                    │  Controller     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │    AKS Cluster     │                    │
        │  (Network Policy   │                    │
        │   Enabled)         │                    │
        │                    │                    │
        │  ┌─────────────────▼──────────────┐    │
        │  │  API Pods (sagesure-api)       │    │
        │  │  - Service Account: sagesure-api│   │
        │  │  - Network Policy: Restricted   │    │
        │  │  - Pod Security: Restricted     │    │
        │  └─────────────────┬──────────────┘    │
        │                    │                    │
        │  ┌─────────────────▼──────────────┐    │
        │  │  Worker Pods (sagesure-worker) │    │
        │  │  - Service Account: sagesure-worker│ │
        │  │  - Network Policy: Restricted   │    │
        │  │  - Pod Security: Restricted     │    │
        │  └─────────────────┬──────────────┘    │
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │  Azure Managed     │                    │
        │  Services          │                    │
        │                    │                    │
        │  ┌─────────────────▼──────────────┐    │
        │  │  PostgreSQL Flexible Server    │    │
        │  │  - Private Endpoint            │    │
        │  │  - NSG: Allow from AKS only    │    │
        │  └────────────────────────────────┘    │
        │                                         │
        │  ┌────────────────────────────────┐    │
        │  │  Azure Cache for Redis         │    │
        │  │  - SSL/TLS Required            │    │
        │  │  - Private Endpoint            │    │
        │  └────────────────────────────────┘    │
        │                                         │
        │  ┌────────────────────────────────┐    │
        │  │  Azure Key Vault               │    │
        │  │  - Premium SKU (HSM)           │    │
        │  │  - Network ACL: AKS subnet     │    │
        │  │  - Soft Delete + Purge Protect │    │
        │  └────────────────────────────────┘    │
        │                                         │
        │  ┌────────────────────────────────┐    │
        │  │  Azure Blob Storage            │    │
        │  │  - Private Endpoint            │    │
        │  │  - Encryption at Rest          │    │
        │  └────────────────────────────────┘    │
        └─────────────────────────────────────────┘
```

## Network Security Groups (NSGs)

### AKS Subnet NSG

**Inbound Rules:**
- Priority 100: Allow HTTPS (443) from Internet
- Priority 110: Allow HTTP (80) from Internet (redirects to HTTPS)
- Priority 120: Allow Kubernetes API (6443) from VirtualNetwork
- Priority 4096: Deny all other inbound traffic

**Outbound Rules:**
- Priority 100: Allow all to AzureCloud (managed services)
- Priority 105: Allow Redis (6380) to AzureCloud
- Priority 106: Allow Key Vault (443) to AzureKeyVault
- Priority 107: Allow Storage (443) to Storage
- Priority 110: Allow all to Internet (external APIs)
- Priority 4095: Deny Azure metadata service (169.254.169.254)

### Database Subnet NSG

**Inbound Rules:**
- Priority 100: Allow PostgreSQL (5432) from AKS subnet only
- Priority 4096: Deny all other inbound traffic

**Outbound Rules:**
- Default Azure rules (allow VirtualNetwork, AzureLoadBalancer, deny Internet)

## Network Policies

Network policies provide pod-level network segmentation within the AKS cluster.

### Default Deny Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

This policy denies all ingress traffic by default. Specific policies must be created to allow traffic.

### API Pod Ingress

- **Allowed From**: Ingress controller namespace (ingress-nginx)
- **Allowed Ports**: 3000 (HTTP)
- **Purpose**: Allow external traffic to reach API pods through ingress

### API Pod Egress

- **Allowed To**: 
  - DNS (kube-system namespace, port 53)
  - PostgreSQL (port 5432)
  - Redis (port 6380)
  - Azure services (port 443)
- **Purpose**: Allow API pods to access required backend services

### Worker Pod Egress

- **Allowed To**:
  - DNS (kube-system namespace, port 53)
  - PostgreSQL (port 5432)
  - Redis (port 6380)
  - Azure services (port 443)
- **Purpose**: Allow worker pods to process background jobs

### Metadata Service Block

- **Blocked**: 169.254.169.254/32 (Azure metadata service)
- **Purpose**: Prevent pods from accessing instance metadata (security hardening)

### Monitoring Pod Policy

- **Ingress**: Allow Prometheus to scrape metrics (port 9090)
- **Egress**: Allow access to Application Insights and pod metrics
- **Purpose**: Enable monitoring and observability

## Role-Based Access Control (RBAC)

### Service Accounts

1. **sagesure-api**: For API pods
2. **sagesure-worker**: For worker pods
3. **sagesure-monitoring**: For monitoring pods
4. **sagesure-deployer**: For CI/CD deployments

### Roles and Permissions

#### API Role (sagesure-api-role)

**Permissions:**
- ConfigMaps: get, list, watch
- Secrets: get, list
- Pods: get, list (own pod info only)

**Principle**: Minimal permissions for reading configuration and secrets

#### Worker Role (sagesure-worker-role)

**Permissions:**
- ConfigMaps: get, list, watch
- Secrets: get, list
- Pods: get, list (own pod info only)

**Principle**: Same as API role, minimal read permissions

#### Monitoring ClusterRole (sagesure-monitoring-clusterrole)

**Permissions:**
- Nodes: get, list, watch (including stats and metrics)
- Pods: get, list, watch (including logs)
- Services: get, list, watch
- Deployments: get, list, watch

**Principle**: Read-only access across cluster for monitoring

#### Deployer Role (sagesure-deployer-role)

**Permissions:**
- Deployments: full CRUD
- Services: full CRUD
- ConfigMaps/Secrets: full CRUD
- Pods: get, list, watch, delete
- Ingress: full CRUD
- HPA: full CRUD

**Principle**: Full deployment permissions for CI/CD

## Azure Key Vault Integration

### Key Vault Configuration

- **SKU**: Premium (HSM-backed keys)
- **Soft Delete**: 90 days retention
- **Purge Protection**: Enabled
- **Network ACLs**: Deny by default, allow AKS subnet

### Access Policies

1. **AKS Kubelet Identity**:
   - Keys: Get, List, Encrypt, Decrypt, WrapKey, UnwrapKey
   - Secrets: Get, List
   - Purpose: Allow pods to access secrets and encryption keys

2. **Terraform Service Principal**:
   - Keys: Full management
   - Secrets: Full management
   - Certificates: Full management
   - Purpose: Infrastructure provisioning

3. **Monitoring Identity**:
   - Secrets: Get, List
   - Purpose: Access connection strings for monitoring

### Secrets Stored

- `postgres-connection-string`: PostgreSQL connection string
- `redis-connection-string`: Redis connection string
- `storage-connection-string`: Blob Storage connection string
- `appinsights-connection-string`: Application Insights connection string
- `appinsights-instrumentation-key`: Application Insights key

### Encryption Keys

- `document-encryption-key`: RSA-HSM 4096-bit key for document encryption

### CSI Driver Integration

The Azure Key Vault Provider for Secrets Store CSI Driver enables:
- Mounting secrets as volumes in pods
- Automatic secret rotation (2-minute poll interval)
- Syncing secrets to Kubernetes secrets for environment variables

## Pod Security Standards

### Restricted Policy

The `sagesure` namespace enforces the **restricted** Pod Security Standard:

```yaml
pod-security.kubernetes.io/enforce: restricted
pod-security.kubernetes.io/audit: restricted
pod-security.kubernetes.io/warn: restricted
```

### Required Security Context

All pods must include:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault

containerSecurityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

### Restrictions

- No privileged containers
- No privilege escalation
- Must run as non-root user
- All capabilities dropped
- Seccomp profile required
- No host network/IPC/PID access

## Data Encryption

### Encryption at Rest

1. **Azure Disk Encryption**: AKS node disks encrypted with platform-managed keys
2. **PostgreSQL**: Transparent Data Encryption (TDE) enabled
3. **Redis**: Data encrypted at rest with Azure-managed keys
4. **Blob Storage**: Server-side encryption with Azure-managed keys
5. **Key Vault**: HSM-backed encryption for keys

### Encryption in Transit

1. **TLS 1.3**: All external communication
2. **TLS 1.2+**: All internal Azure service communication
3. **Redis SSL**: Port 6380 with SSL/TLS required
4. **PostgreSQL SSL**: sslmode=require enforced

### Application-Level Encryption

1. **Document Encryption**: AES-256-GCM with unique keys per document
2. **Key Management**: Keys stored in Azure Key Vault (HSM-backed)
3. **Key Rotation**: Automated rotation with re-encryption

## Security Monitoring

### Azure Policy for Kubernetes

Enabled policies:
- Enforce HTTPS ingress
- Require resource limits
- Disallow privileged containers
- Require read-only root filesystem (where applicable)
- Enforce Pod Security Standards

### Audit Logging

- **Kubernetes Audit Logs**: Sent to Log Analytics
- **Azure Activity Logs**: All resource changes logged
- **Key Vault Audit Logs**: All secret access logged
- **NSG Flow Logs**: Network traffic patterns

### Alerts

- Failed authentication attempts
- Unauthorized access attempts
- Network policy violations
- Key Vault access anomalies
- Pod security violations

## Compliance

This configuration addresses:

- **DPDP Act 2023**: Data encryption, access controls, audit logging
- **IRDAI Guidelines**: Secure data handling, audit trails
- **ISO 27001**: Information security management
- **CIS Kubernetes Benchmark**: Security hardening

## Security Testing

### Penetration Testing

Recommended tests:
1. Network policy bypass attempts
2. RBAC privilege escalation
3. Key Vault access from unauthorized pods
4. Metadata service access attempts
5. Container escape attempts

### Vulnerability Scanning

- Container image scanning (Azure Defender for Containers)
- Dependency vulnerability scanning (Dependabot)
- Infrastructure scanning (Azure Security Center)

## Incident Response

### Security Incident Workflow

1. **Detection**: Azure Security Center alerts
2. **Containment**: Network policy isolation
3. **Investigation**: Audit log analysis
4. **Remediation**: Patch and redeploy
5. **Recovery**: Restore from backups if needed
6. **Post-Incident**: Update security policies

### Emergency Procedures

- Revoke compromised Key Vault access policies
- Rotate all secrets and keys
- Isolate affected pods with network policies
- Scale down compromised deployments
- Review audit logs for breach extent

## Maintenance

### Regular Tasks

- **Weekly**: Review security alerts and audit logs
- **Monthly**: Update container images and dependencies
- **Quarterly**: Rotate Key Vault secrets
- **Annually**: Penetration testing and security audit

### Key Rotation

```bash
# Rotate document encryption key
az keyvault key rotate --vault-name sagesure-india-kv --name document-encryption-key

# Update secrets
az keyvault secret set --vault-name sagesure-india-kv --name postgres-connection-string --value "new-value"
```

## References

- [Azure AKS Security Best Practices](https://docs.microsoft.com/en-us/azure/aks/security-best-practices)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
