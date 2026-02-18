# Security Deployment Guide

This guide covers the deployment of networking and security configurations for the SageSure India Platform on Azure Kubernetes Service (AKS).

## Overview

The security configuration includes:
- Network Security Groups (NSGs) for subnet-level security
- Network Policies for pod-to-pod isolation
- Role-Based Access Control (RBAC) for cluster access
- Azure Key Vault integration for secrets management
- Pod Security Standards for container security

## Prerequisites

- AKS cluster deployed via Terraform (see `infrastructure/terraform/`)
- `kubectl` configured to access the cluster
- `helm` installed (v3.0+)
- Azure CLI installed and authenticated

## Deployment Steps

### 1. Verify Terraform Infrastructure

Ensure the following resources are deployed:

```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

This creates:
- Virtual Network with AKS and database subnets
- Network Security Groups with security rules
- Azure Key Vault with access policies
- AKS cluster with Azure CNI and Network Policy enabled

### 2. Install Azure Key Vault CSI Driver

The CSI driver enables pods to mount secrets from Azure Key Vault:

```bash
# Add Helm repository
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
helm repo update

# Install the CSI driver
helm install csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --namespace kube-system \
  --generate-name \
  -f infrastructure/kubernetes/keyvault-csi-driver-values.yaml

# Verify installation
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-azure
```

### 3. Create Namespace with Pod Security Standards

```bash
# Apply namespace with Pod Security Standards labels
kubectl apply -f infrastructure/kubernetes/pod-security-standards.yaml

# Verify namespace labels
kubectl get namespace sagesure -o yaml | grep pod-security
```

Expected output:
```
pod-security.kubernetes.io/audit: restricted
pod-security.kubernetes.io/enforce: restricted
pod-security.kubernetes.io/warn: restricted
```

### 4. Deploy RBAC Configuration

```bash
# Apply RBAC resources
kubectl apply -f infrastructure/kubernetes/rbac.yaml

# Verify service accounts
kubectl get serviceaccounts -n sagesure

# Verify roles and role bindings
kubectl get roles,rolebindings -n sagesure
kubectl get clusterroles,clusterrolebindings | grep sagesure
```

### 5. Configure Key Vault Access

Update the SecretProviderClass with your Key Vault details:

```bash
# Get Key Vault name from Terraform output
export KEY_VAULT_NAME=$(cd infrastructure/terraform && terraform output -raw key_vault_name)

# Get tenant ID
export TENANT_ID=$(az account show --query tenantId -o tsv)

# Get AKS kubelet identity
export KUBELET_IDENTITY=$(cd infrastructure/terraform && terraform output -raw aks_kubelet_identity_object_id)

# Update keyvault-csi.yaml with these values
sed -i "s/keyvaultName: \".*\"/keyvaultName: \"$KEY_VAULT_NAME\"/" infrastructure/kubernetes/keyvault-csi.yaml
sed -i "s/tenantId: \".*\"/tenantId: \"$TENANT_ID\"/" infrastructure/kubernetes/keyvault-csi.yaml
sed -i "s/userAssignedIdentityID: \".*\"/userAssignedIdentityID: \"$KUBELET_IDENTITY\"/" infrastructure/kubernetes/keyvault-csi.yaml

# Apply SecretProviderClass
kubectl apply -f infrastructure/kubernetes/keyvault-csi.yaml
```

### 6. Deploy Network Policies

```bash
# Apply network policies
kubectl apply -f infrastructure/kubernetes/network-policies.yaml

# Verify network policies
kubectl get networkpolicies -n sagesure
```

Expected policies:
- `default-deny-ingress` - Denies all ingress by default
- `allow-api-ingress` - Allows ingress to API pods from ingress controller
- `allow-api-to-postgres` - Allows API pods to access PostgreSQL
- `allow-api-to-redis` - Allows API pods to access Redis
- `allow-worker-egress` - Allows worker pods to access required services
- `deny-metadata-service` - Blocks access to Azure metadata service
- `allow-monitoring` - Allows monitoring pods to scrape metrics

### 7. Test Network Policies

```bash
# Deploy a test pod
kubectl run test-pod --image=busybox --rm -it --restart=Never -n sagesure -- sh

# Inside the pod, test connectivity
# This should fail (blocked by default-deny-ingress)
wget -O- http://sagesure-api:3000/health

# Exit the test pod
exit
```

### 8. Verify Key Vault Integration

```bash
# Deploy an example pod that uses Key Vault secrets
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-keyvault
  namespace: sagesure
spec:
  serviceAccountName: sagesure-api
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "cat /mnt/secrets-store/POSTGRES_CONNECTION_STRING && sleep 3600"]
      volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets-store"
          readOnly: true
  volumes:
    - name: secrets-store
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "sagesure-keyvault-secrets"
EOF

# Check if secrets are mounted
kubectl logs test-keyvault -n sagesure

# Clean up
kubectl delete pod test-keyvault -n sagesure
```

## Security Verification Checklist

### Network Security

- [ ] NSG rules are applied to AKS and database subnets
- [ ] Default deny ingress policy is active
- [ ] API pods can only receive traffic from ingress controller
- [ ] Worker pods cannot receive any ingress traffic
- [ ] Metadata service access is blocked
- [ ] Only required egress traffic is allowed

### RBAC

- [ ] Service accounts exist for API, worker, and monitoring pods
- [ ] Roles have minimal required permissions
- [ ] Role bindings are correctly configured
- [ ] CI/CD service account has deployment permissions
- [ ] Monitoring service account has read-only cluster access

### Key Vault

- [ ] Key Vault is accessible only from AKS subnet
- [ ] AKS kubelet identity has Get/List permissions for secrets and keys
- [ ] Document encryption key is created (RSA-HSM 4096-bit)
- [ ] Connection strings are stored as secrets
- [ ] CSI driver can mount secrets in pods

### Pod Security

- [ ] Namespace has Pod Security Standards labels (restricted)
- [ ] Pods run as non-root user (UID 1000)
- [ ] Privilege escalation is disabled
- [ ] All capabilities are dropped
- [ ] Seccomp profile is set to RuntimeDefault
- [ ] Root filesystem is not read-only (required for app functionality)

## Troubleshooting

### Network Policy Issues

If pods cannot communicate:

```bash
# Check network policy logs
kubectl logs -n kube-system -l k8s-app=cilium

# Describe network policies
kubectl describe networkpolicy -n sagesure

# Temporarily disable network policies for testing
kubectl delete networkpolicy --all -n sagesure
```

### Key Vault Access Issues

If pods cannot access Key Vault:

```bash
# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-secrets-store-provider-azure

# Verify Key Vault access policy
az keyvault show --name $KEY_VAULT_NAME --query properties.accessPolicies

# Check pod events
kubectl describe pod <pod-name> -n sagesure
```

### RBAC Issues

If pods cannot access Kubernetes resources:

```bash
# Check service account
kubectl get serviceaccount sagesure-api -n sagesure -o yaml

# Check role bindings
kubectl get rolebinding -n sagesure -o yaml

# Test permissions
kubectl auth can-i get secrets --as=system:serviceaccount:sagesure:sagesure-api -n sagesure
```

## Security Best Practices

1. **Least Privilege**: Grant only the minimum required permissions
2. **Defense in Depth**: Use multiple layers of security (NSG, Network Policy, RBAC)
3. **Secret Rotation**: Rotate Key Vault secrets regularly (automated via CSI driver)
4. **Audit Logging**: Enable Azure Policy and monitor audit logs
5. **Network Segmentation**: Isolate workloads using network policies
6. **Pod Security**: Enforce restricted Pod Security Standards
7. **Image Security**: Scan container images for vulnerabilities
8. **TLS Everywhere**: Use TLS for all internal and external communication

## Monitoring and Alerts

Set up alerts for security events:

```bash
# Enable Azure Policy for Kubernetes
az aks enable-addons --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --addons azure-policy

# View policy compliance
az policy state list --resource-group sagesure-india-rg
```

## Compliance

This configuration addresses the following requirements:
- **Requirement 2.2**: Data encryption and security
- **Requirement 2.4**: Azure Key Vault integration
- **Requirement 21.1**: Audit trail for security events
- **Requirement 23.2**: Scalability and high availability
- **Requirement 23.3**: Auto-scaling configuration

## References

- [Azure Kubernetes Service Security Best Practices](https://docs.microsoft.com/en-us/azure/aks/security-best-practices)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Azure Key Vault Provider for Secrets Store CSI Driver](https://azure.github.io/secrets-store-csi-driver-provider-azure/)
