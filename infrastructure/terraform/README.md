# SageSure India Platform - Terraform Infrastructure

This directory contains Terraform configuration for deploying the Azure Kubernetes Service (AKS) cluster and related infrastructure for the SageSure India Platform.

## Architecture Overview

The infrastructure includes:

### Compute & Orchestration
- **Azure Kubernetes Service (AKS)**: 3-node cluster with D4s_v3 instances (4 vCPU, 16GB RAM each)
- **Horizontal Pod Autoscaler**: Auto-scales from 2-10 nodes based on 70% CPU and 80% memory utilization
- **NGINX Ingress Controller**: Manages external access to services with SSL/TLS termination
- **Cert Manager**: Automates Let's Encrypt SSL certificate provisioning and renewal
- **Azure Container Registry**: Private Docker image registry

### Networking
- **Virtual Network**: Isolated network with separate subnets for AKS and databases
- **Network Security Groups**: Firewall rules for secure access
- **Private DNS Zones**: Private DNS resolution for managed services

### Managed Services
- **PostgreSQL 15 Flexible Server**: 100GB storage, zone-redundant high availability
- **Azure Cache for Redis**: 1GB Standard tier with TLS 1.2
- **Azure Blob Storage**: Geo-redundant storage for documents with versioning
- **Azure Key Vault**: Premium tier with HSM-backed keys for secrets and encryption
- **Application Insights**: Application performance monitoring
- **Log Analytics Workspace**: Centralized logging and monitoring

## Requirements

### Prerequisites

1. **Azure CLI** (version 2.50+)
   ```bash
   # Install on macOS
   brew install azure-cli
   
   # Install on Ubuntu/Debian
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Terraform** (version 1.5+)
   ```bash
   # Install on macOS
   brew install terraform
   
   # Install on Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

3. **kubectl** (version 1.27+)
   ```bash
   # Install on macOS
   brew install kubectl
   
   # Install on Ubuntu/Debian
   sudo apt-get update && sudo apt-get install -y kubectl
   ```

4. **Helm** (version 3.11+)
   ```bash
   # Install on macOS
   brew install helm
   
   # Install on Ubuntu/Debian
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   ```

### Azure Subscription

- Active Azure subscription with sufficient credits
- Contributor or Owner role on the subscription
- Resource providers registered: Microsoft.ContainerService, Microsoft.Network, Microsoft.Storage

## Quick Start

### 1. Login to Azure

```bash
az login
az account list --output table
az account set --subscription "<SUBSCRIPTION_ID>"
```

### 2. Create Terraform Backend Storage (One-time setup)

```bash
# Create resource group for Terraform state
az group create --name sagesure-terraform-rg --location southeastasia

# Create storage account
az storage account create \
  --name sagesureterraformsa \
  --resource-group sagesure-terraform-rg \
  --location southeastasia \
  --sku Standard_LRS \
  --encryption-services blob

# Create blob container
az storage container create \
  --name tfstate \
  --account-name sagesureterraformsa
```

### 3. Configure Variables

```bash
# Copy the example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

**Important**: Set a strong password for PostgreSQL:
- Minimum 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Do not commit `terraform.tfvars` to version control

### 4. Initialize Terraform

```bash
terraform init
```

### 5. Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the plan to ensure all resources are correct.

### 6. Apply Configuration

```bash
terraform apply tfplan
```

This will create:
- Resource group
- Virtual network with subnets
- Network security groups
- AKS cluster with 3 nodes
- Azure Container Registry
- PostgreSQL 15 Flexible Server (100GB, zone-redundant)
- Azure Cache for Redis (1GB)
- Azure Blob Storage with containers (policies, claims, vault, scam-evidence)
- Azure Key Vault with encryption keys
- Application Insights
- Log Analytics workspace
- NGINX Ingress Controller (via Helm)
- Cert Manager (via Helm)
- Let's Encrypt ClusterIssuers

**Deployment time**: Approximately 15-20 minutes

### 7. Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### 8. Verify Ingress Controller

```bash
# Check NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

# Get LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### 9. Verify Cert Manager

```bash
# Check Cert Manager
kubectl get pods -n cert-manager

# Check ClusterIssuers
kubectl get clusterissuers
```

### 10. Access Managed Services

```bash
# View all managed services information
terraform output managed_services_summary

# Get PostgreSQL connection string from Key Vault
az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name postgres-connection-string \
  --query value -o tsv

# Get Redis connection string from Key Vault
az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name redis-connection-string \
  --query value -o tsv

# Get Application Insights connection string
az keyvault secret show \
  --vault-name $(terraform output -raw key_vault_name) \
  --name appinsights-connection-string \
  --query value -o tsv
```

## Configuration

### Variables

Key variables in `terraform.tfvars`:

| Variable | Description | Default |
|----------|-------------|---------|
| `resource_group_name` | Resource group name | `sagesure-india-rg` |
| `location` | Azure region | `southeastasia` |
| `aks_cluster_name` | AKS cluster name | `sagesure-aks-prod` |
| `aks_node_count` | Initial node count | `3` |
| `aks_node_vm_size` | VM size for nodes | `Standard_D4s_v3` |
| `aks_min_node_count` | Min nodes for autoscaling | `2` |
| `aks_max_node_count` | Max nodes for autoscaling | `10` |
| `hpa_cpu_threshold` | CPU threshold for HPA | `70` |
| `hpa_memory_threshold` | Memory threshold for HPA | `80` |
| `postgres_admin_username` | PostgreSQL admin username | `sagesure_admin` |
| `postgres_admin_password` | PostgreSQL admin password | (required, sensitive) |
| `letsencrypt_email` | Email for Let's Encrypt | `admin@sagesure.in` |

### Horizontal Pod Autoscaler (HPA)

The NGINX Ingress Controller is configured with HPA:
- **Min replicas**: 2
- **Max replicas**: 10
- **CPU target**: 70%
- **Memory target**: 80%

The AKS cluster nodes also autoscale:
- **Min nodes**: 2
- **Max nodes**: 10
- Based on resource utilization

## Outputs

After deployment, Terraform provides these outputs:

```bash
# View all outputs
terraform output

# View specific output
terraform output aks_cluster_name
terraform output nginx_ingress_ip

# Get kubeconfig
terraform output -raw kube_config_raw > ~/.kube/sagesure-config
```

## DNS Configuration

After deployment, configure your DNS:

1. Get the LoadBalancer IP:
   ```bash
   terraform output nginx_ingress_ip
   ```

2. Create an A record in your DNS provider:
   ```
   Type: A
   Name: @ (or your subdomain)
   Value: <LoadBalancer IP>
   TTL: 300
   ```

3. For wildcard subdomains:
   ```
   Type: A
   Name: *
   Value: <LoadBalancer IP>
   TTL: 300
   ```

## SSL Certificates

Cert Manager is configured with two Let's Encrypt ClusterIssuers:

### Staging (for testing)
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-tls-staging
spec:
  secretName: example-tls-staging
  issuerRef:
    name: letsencrypt-staging
    kind: ClusterIssuer
  dnsNames:
    - example.sagesure.in
```

### Production
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-tls
spec:
  secretName: example-tls
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - example.sagesure.in
```

Or use annotations in Ingress:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-production"
spec:
  tls:
    - hosts:
        - example.sagesure.in
      secretName: example-tls
  rules:
    - host: example.sagesure.in
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: example-service
                port:
                  number: 80
```

## Monitoring

### View Logs

```bash
# AKS cluster logs
az aks show --resource-group sagesure-india-rg --name sagesure-aks-prod

# Log Analytics queries
az monitor log-analytics query \
  --workspace sagesure-india-log-analytics \
  --analytics-query "ContainerLog | limit 100"
```

### Metrics

```bash
# Node metrics
kubectl top nodes

# Pod metrics
kubectl top pods -A

# HPA status
kubectl get hpa -A
```

## Scaling

### Manual Node Scaling

```bash
# Scale nodes
az aks scale \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --node-count 5
```

### Manual Pod Scaling

```bash
# Scale a deployment
kubectl scale deployment <deployment-name> --replicas=5 -n <namespace>
```

### Autoscaling Status

```bash
# Check cluster autoscaler
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml

# Check HPA
kubectl get hpa -A
kubectl describe hpa <hpa-name> -n <namespace>
```

## Maintenance

### Upgrade Kubernetes Version

```bash
# Check available versions
az aks get-upgrades --resource-group sagesure-india-rg --name sagesure-aks-prod

# Upgrade cluster
az aks upgrade \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --kubernetes-version 1.28.0
```

### Update Terraform Configuration

```bash
# Pull latest changes
git pull

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -A

# Describe pod
kubectl describe pod <pod-name> -n <namespace>

# View logs
kubectl logs <pod-name> -n <namespace>
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check ingress resources
kubectl get ingress -A
kubectl describe ingress <ingress-name> -n <namespace>
```

### Certificate Issues

```bash
# Check cert-manager
kubectl get pods -n cert-manager
kubectl logs -n cert-manager -l app=cert-manager

# Check certificates
kubectl get certificates -A
kubectl describe certificate <cert-name> -n <namespace>

# Check certificate requests
kubectl get certificaterequests -A
```

### Node Issues

```bash
# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Check node logs
az aks show --resource-group sagesure-india-rg --name sagesure-aks-prod
```

## Cleanup

To destroy all resources:

```bash
# Destroy infrastructure
terraform destroy

# Confirm with 'yes' when prompted
```

**Warning**: This will delete all resources including the AKS cluster, databases, and storage. Ensure you have backups before proceeding.

## Cost Estimation

Approximate monthly costs (Southeast Asia region):

| Resource | Cost |
|----------|------|
| AKS cluster (3 x D4s_v3) | ~$220 |
| PostgreSQL Flexible Server (GP_Standard_D4s_v3, 100GB) | ~$180 |
| Azure Cache for Redis (1GB Standard) | ~$25 |
| Blob Storage (GRS, 100GB) | ~$5 |
| Key Vault (Premium) | ~$5 |
| Application Insights | ~$50 |
| Load Balancer | ~$30 |
| Log Analytics | ~$50 |
| Container Registry | ~$50 |
| Network egress | ~$50 |
| **Total** | **~$665-750/month** |

With Azure credits, this infrastructure can run for 6-7 months on a $50,000 credit allocation.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Azure AKS documentation: https://docs.microsoft.com/azure/aks/
3. Review Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/

## Requirements Mapping

This infrastructure satisfies the following requirements:

- **Requirement 2.4**: Data encryption and security
  - PostgreSQL with database-level encryption
  - Azure Key Vault for secrets and encryption keys
  - TLS 1.2+ for all data in transit
  - AES-256 encryption for documents in Blob Storage
  
- **Requirement 13.2**: Encrypted document storage
  - Azure Blob Storage with versioning and soft delete
  - Geo-redundant storage for disaster recovery
  - Private network access from AKS cluster
  - Encryption keys managed in Azure Key Vault
  
- **Requirement 23.2**: Support 10,000+ concurrent users without performance degradation
  - Implemented via AKS cluster with autoscaling (2-10 nodes)
  - D4s_v3 instances provide sufficient compute resources
  - Redis caching for performance optimization
  
- **Requirement 23.3**: Auto-scale Kubernetes pods from 2 to 10 nodes
  - Cluster autoscaler configured with min=2, max=10
  - HPA configured with CPU threshold=70%, memory threshold=80%
  - NGINX Ingress Controller has HPA enabled

## Next Steps

After infrastructure deployment:

1. Deploy application workloads (see `../kubernetes/` directory)
2. Configure monitoring and alerting
3. Set up CI/CD pipelines
4. Configure backup and disaster recovery
5. Implement security policies
6. Set up cost monitoring and optimization
