# Kubernetes Infrastructure

This directory contains Kubernetes manifests and configuration files for the SageSure India Platform.

## Directory Structure

```
infrastructure/kubernetes/
├── README.md                           # This file
├── NETWORKING_SECURITY_OVERVIEW.md    # Comprehensive security architecture
├── SECURITY_DEPLOYMENT.md             # Step-by-step deployment guide
├── network-policies.yaml              # Pod-to-pod network isolation
├── rbac.yaml                          # Role-based access control
├── pod-security-standards.yaml        # Pod security configuration
├── keyvault-csi.yaml                  # Key Vault secrets integration
└── keyvault-csi-driver-values.yaml    # Helm values for CSI driver
```

## Quick Start

### Prerequisites

1. AKS cluster deployed via Terraform
2. `kubectl` configured to access the cluster
3. `helm` installed (v3.0+)
4. Azure CLI authenticated

### Deployment Order

1. **Install Key Vault CSI Driver**
   ```bash
   helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
   helm install csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
     --namespace kube-system \
     --generate-name \
     -f keyvault-csi-driver-values.yaml
   ```

2. **Apply Pod Security Standards**
   ```bash
   kubectl apply -f pod-security-standards.yaml
   ```

3. **Deploy RBAC Configuration**
   ```bash
   kubectl apply -f rbac.yaml
   ```

4. **Configure Key Vault Access**
   ```bash
   # Update keyvault-csi.yaml with your Key Vault details
   kubectl apply -f keyvault-csi.yaml
   ```

5. **Deploy Network Policies**
   ```bash
   kubectl apply -f network-policies.yaml
   ```

## Configuration Files

### network-policies.yaml

Implements pod-to-pod network isolation:
- Default deny all ingress traffic
- Allow API pods to receive traffic from ingress controller
- Allow API and worker pods to access PostgreSQL and Redis
- Block access to Azure metadata service
- Allow monitoring pods to scrape metrics

**Requirements**: 2.2, 2.4

### rbac.yaml

Configures role-based access control:
- Service accounts for API, worker, monitoring, and CI/CD
- Roles with minimal required permissions
- Role bindings for service accounts
- ClusterRole for monitoring with read-only access

**Requirements**: 2.2, 2.4

### pod-security-standards.yaml

Enforces Pod Security Standards:
- Namespace labels for restricted policy
- Security context configuration
- Example deployment with proper security settings
- Replaces deprecated PodSecurityPolicy

**Requirements**: 2.2, 2.4

### keyvault-csi.yaml

Integrates Azure Key Vault with Kubernetes:
- SecretProviderClass for mounting secrets
- Configuration for PostgreSQL, Redis, Storage, and Application Insights
- Example pod showing secret usage

**Requirements**: 2.4

### keyvault-csi-driver-values.yaml

Helm values for CSI driver installation:
- Enable secret rotation (2-minute interval)
- Resource limits for driver pods
- Metrics and logging configuration

**Requirements**: 2.4

## Security Features

### Network Security

- **NSG Rules**: Subnet-level security for AKS and database
- **Network Policies**: Pod-level network segmentation
- **Metadata Block**: Prevent access to Azure metadata service
- **Default Deny**: All traffic denied unless explicitly allowed

### Access Control

- **RBAC**: Least privilege access for all service accounts
- **Service Accounts**: Separate accounts for different workloads
- **Pod Security**: Restricted policy enforced at namespace level
- **Key Vault ACLs**: Network-restricted access to secrets

### Encryption

- **TLS 1.3**: All external communication
- **TLS 1.2+**: All Azure service communication
- **AES-256**: Document encryption with Key Vault keys
- **HSM-backed**: Premium Key Vault with hardware security modules

## Verification

### Check Network Policies

```bash
kubectl get networkpolicies -n sagesure
kubectl describe networkpolicy default-deny-ingress -n sagesure
```

### Check RBAC

```bash
kubectl get serviceaccounts -n sagesure
kubectl get roles,rolebindings -n sagesure
kubectl auth can-i get secrets --as=system:serviceaccount:sagesure:sagesure-api -n sagesure
```

### Check Pod Security

```bash
kubectl get namespace sagesure -o yaml | grep pod-security
```

### Check Key Vault Integration

```bash
kubectl get secretproviderclass -n sagesure
kubectl logs -n kube-system -l app=csi-secrets-store-provider-azure
```

## Troubleshooting

### Network Policy Issues

If pods cannot communicate:

```bash
# Check network policy logs
kubectl logs -n kube-system -l k8s-app=cilium

# Temporarily disable for testing
kubectl delete networkpolicy --all -n sagesure
```

### Key Vault Access Issues

If pods cannot access secrets:

```bash
# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-secrets-store-provider-azure

# Verify access policy
az keyvault show --name <vault-name> --query properties.accessPolicies
```

### RBAC Issues

If pods cannot access resources:

```bash
# Check service account
kubectl get serviceaccount sagesure-api -n sagesure -o yaml

# Test permissions
kubectl auth can-i get secrets --as=system:serviceaccount:sagesure:sagesure-api -n sagesure
```

## Documentation

- **[NETWORKING_SECURITY_OVERVIEW.md](NETWORKING_SECURITY_OVERVIEW.md)**: Comprehensive security architecture and design
- **[SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md)**: Step-by-step deployment guide with verification steps

## Compliance

This configuration addresses:
- **Requirement 2.2**: Data encryption and security
- **Requirement 2.4**: Azure Key Vault integration
- **Requirement 21.1**: Audit trail for security events
- **Requirement 23.2**: Scalability and high availability

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed documentation files
3. Check Azure Security Center for security alerts
4. Review audit logs in Log Analytics

## References

- [Azure AKS Security](https://docs.microsoft.com/en-us/azure/aks/security-best-practices)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Azure Key Vault CSI Driver](https://azure.github.io/secrets-store-csi-driver-provider-azure/)
