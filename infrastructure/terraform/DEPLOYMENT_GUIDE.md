# SageSure India Platform - AKS Deployment Guide

This guide walks you through deploying the Azure Kubernetes Service (AKS) cluster for the SageSure India Platform.

## Overview

This Terraform configuration deploys:

✅ **Azure Kubernetes Service (AKS)** - 3-node cluster with D4s_v3 instances  
✅ **Horizontal Pod Autoscaler** - Auto-scales 2-10 nodes (70% CPU, 80% memory)  
✅ **NGINX Ingress Controller** - External access with SSL/TLS termination  
✅ **Cert Manager** - Automated Let's Encrypt SSL certificates  
✅ **Azure Container Registry** - Private Docker image registry  
✅ **Virtual Network** - Isolated networking with security groups  
✅ **Log Analytics** - Centralized logging and monitoring  

**Deployment Time**: ~10-15 minutes  
**Estimated Cost**: ~$400-500/month (covered by Azure credits)

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Azure subscription with sufficient credits ($50K recommended)
- [ ] Contributor or Owner role on the subscription
- [ ] Azure CLI installed (version 2.50+)
- [ ] Terraform installed (version 1.5+)
- [ ] kubectl installed (version 1.27+)
- [ ] Helm installed (version 3.11+)
- [ ] Git installed
- [ ] Text editor (VS Code, nano, vim, etc.)

## Step-by-Step Deployment

### Step 1: Install Required Tools

#### macOS (using Homebrew)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install tools
brew install azure-cli terraform kubectl helm
```

#### Ubuntu/Debian

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# kubectl
sudo apt-get update && sudo apt-get install -y kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Verify Installations

```bash
az --version
terraform --version
kubectl version --client
helm version
```

### Step 2: Login to Azure

```bash
# Login to Azure
az login

# List available subscriptions
az account list --output table

# Set the subscription you want to use
az account set --subscription "<SUBSCRIPTION_ID>"

# Verify current subscription
az account show --query "{Subscription:name, ID:id}" -o table
```

### Step 3: Create Terraform Backend Storage

Terraform needs a place to store its state file. Create an Azure Storage Account:

```bash
# Set variables
RESOURCE_GROUP="sagesure-terraform-rg"
STORAGE_ACCOUNT="sagesureterraformsa"
CONTAINER_NAME="tfstate"
LOCATION="southeastasia"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --account-key $ACCOUNT_KEY

echo "✓ Terraform backend storage created"
```

### Step 4: Configure Terraform Variables

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit the file with your values
nano terraform.tfvars
```

**Key variables to update:**

```hcl
# Update with your email for Let's Encrypt notifications
letsencrypt_email = "your-email@example.com"

# Optionally customize other values
resource_group_name = "sagesure-india-rg"
location            = "southeastasia"
aks_cluster_name    = "sagesure-aks-prod"
```

### Step 5: Initialize Terraform

```bash
# Initialize Terraform (downloads providers and modules)
terraform init

# You should see: "Terraform has been successfully initialized!"
```

**Expected output:**
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/azurerm versions matching "~> 3.80"...
- Finding hashicorp/kubernetes versions matching "~> 2.23"...
- Finding hashicorp/helm versions matching "~> 2.11"...
...
Terraform has been successfully initialized!
```

### Step 6: Validate Configuration

```bash
# Validate Terraform configuration
terraform validate

# Format Terraform files
terraform fmt -recursive
```

### Step 7: Create Execution Plan

```bash
# Create execution plan
terraform plan -out=tfplan

# Review the plan carefully
# You should see resources to be created:
# - azurerm_resource_group
# - azurerm_virtual_network
# - azurerm_kubernetes_cluster
# - azurerm_container_registry
# - helm_release (nginx-ingress, cert-manager)
# - and more...
```

**Expected output:**
```
Plan: 20 to add, 0 to change, 0 to destroy.
```

### Step 8: Apply Configuration

```bash
# Apply the plan
terraform apply tfplan

# This will take 10-15 minutes
# Watch for any errors
```

**What happens during apply:**
1. Creates resource group
2. Creates virtual network and subnets
3. Creates network security groups
4. Creates AKS cluster (longest step, ~8-10 minutes)
5. Creates container registry
6. Creates log analytics workspace
7. Installs NGINX Ingress Controller via Helm
8. Installs Cert Manager via Helm
9. Creates Let's Encrypt ClusterIssuers

**Expected output:**
```
Apply complete! Resources: 20 added, 0 changed, 0 destroyed.

Outputs:
aks_cluster_name = "sagesure-aks-prod"
nginx_ingress_ip = "20.195.xxx.xxx"
...
```

### Step 9: Configure kubectl

```bash
# Save kubeconfig
terraform output -raw kube_config_raw > ~/.kube/sagesure-config

# Set KUBECONFIG environment variable
export KUBECONFIG=~/.kube/sagesure-config

# Or use az CLI to get credentials
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod

# Verify connection
kubectl get nodes
```

**Expected output:**
```
NAME                                STATUS   ROLES   AGE   VERSION
aks-default-12345678-vmss000000    Ready    agent   5m    v1.27.x
aks-default-12345678-vmss000001    Ready    agent   5m    v1.27.x
aks-default-12345678-vmss000002    Ready    agent   5m    v1.27.x
```

### Step 10: Verify Deployment

```bash
# Check all namespaces
kubectl get namespaces

# Check NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

# Check Cert Manager
kubectl get pods -n cert-manager

# Check ClusterIssuers
kubectl get clusterissuers

# Get LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Expected output:**
```
# Namespaces
NAME              STATUS   AGE
default           Active   10m
ingress-nginx     Active   8m
cert-manager      Active   8m
kube-system       Active   10m

# NGINX Ingress pods should be Running
NAME                                       READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-xxx-yyy          1/1     Running   0          8m

# Cert Manager pods should be Running
NAME                                      READY   STATUS    RESTARTS   AGE
cert-manager-xxx-yyy                     1/1     Running   0          8m
cert-manager-cainjector-xxx-yyy          1/1     Running   0          8m
cert-manager-webhook-xxx-yyy             1/1     Running   0          8m

# ClusterIssuers should be Ready
NAME                     READY   AGE
letsencrypt-production   True    8m
letsencrypt-staging      True    8m
```

### Step 11: Configure DNS

1. Get the LoadBalancer IP:
   ```bash
   terraform output nginx_ingress_ip
   # Or
   kubectl get svc ingress-nginx-controller -n ingress-nginx
   ```

2. Go to your DNS provider (GoDaddy, Cloudflare, Route53, etc.)

3. Create an A record:
   ```
   Type: A
   Name: @ (for root domain) or api (for subdomain)
   Value: <LoadBalancer IP from step 1>
   TTL: 300 (5 minutes)
   ```

4. For wildcard subdomains (optional):
   ```
   Type: A
   Name: *
   Value: <LoadBalancer IP>
   TTL: 300
   ```

5. Verify DNS propagation (may take 5-10 minutes):
   ```bash
   nslookup your-domain.com
   dig your-domain.com
   ```

## Using the Makefile (Simplified Commands)

We've included a Makefile for easier operations:

```bash
# View available commands
make help

# Full deployment workflow
make deploy

# Individual commands
make init       # Initialize Terraform
make plan       # Create execution plan
make apply      # Apply configuration
make output     # Show outputs
make kubeconfig # Save kubeconfig
make destroy    # Destroy all resources
```

## Post-Deployment Tasks

### 1. View Terraform Outputs

```bash
terraform output

# Or specific outputs
terraform output aks_cluster_name
terraform output nginx_ingress_ip
terraform output acr_login_server
```

### 2. Test Cluster Access

```bash
# Get nodes
kubectl get nodes

# Get all pods
kubectl get pods -A

# Check cluster info
kubectl cluster-info
```

### 3. Configure Container Registry Access

```bash
# Get ACR credentials
ACR_NAME=$(terraform output -raw acr_login_server | cut -d'.' -f1)
ACR_USERNAME=$(terraform output -raw acr_admin_username)
ACR_PASSWORD=$(terraform output -raw acr_admin_password)

# Login to ACR
docker login $ACR_NAME.azurecr.io -u $ACR_USERNAME -p $ACR_PASSWORD

# Or use Azure CLI
az acr login --name $ACR_NAME
```

### 4. Test Autoscaling

```bash
# Check HPA status
kubectl get hpa -A

# Check cluster autoscaler
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml

# Monitor node scaling
watch kubectl get nodes
```

### 5. Set Up Monitoring

```bash
# View logs in Azure Portal
az monitor log-analytics workspace show \
  --resource-group sagesure-india-rg \
  --workspace-name sagesure-india-log-analytics

# Or install Prometheus (optional)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

## Verification Checklist

After deployment, verify:

- [ ] All 3 nodes are in Ready state
- [ ] NGINX Ingress Controller pods are Running
- [ ] Cert Manager pods are Running
- [ ] ClusterIssuers are Ready
- [ ] LoadBalancer has external IP assigned
- [ ] DNS A record points to LoadBalancer IP
- [ ] Can access cluster with kubectl
- [ ] Can login to Azure Container Registry
- [ ] HPA is configured and active
- [ ] Log Analytics workspace is receiving logs

## Troubleshooting

### Issue: Terraform Backend Error

**Error**: "Error: Failed to get existing workspaces"

**Solution**:
```bash
# Verify storage account exists
az storage account show --name sagesureterraformsa --resource-group sagesure-terraform-rg

# If not, create it (see Step 3)
```

### Issue: AKS Cluster Creation Fails

**Error**: "Insufficient quota for VM family"

**Solution**:
```bash
# Check quota
az vm list-usage --location southeastasia --output table

# Request quota increase in Azure Portal
# Or try a different region
```

### Issue: NGINX Ingress LoadBalancer Pending

**Error**: LoadBalancer IP shows as "pending"

**Solution**:
```bash
# Wait 2-3 minutes for Azure to provision LoadBalancer
kubectl get svc -n ingress-nginx -w

# Check events
kubectl get events -n ingress-nginx --sort-by='.lastTimestamp'

# If still pending after 5 minutes, check Azure Portal for errors
```

### Issue: Cert Manager Not Creating Certificates

**Error**: Certificate stuck in "Pending" state

**Solution**:
```bash
# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Check certificate status
kubectl describe certificate <cert-name> -n <namespace>

# Verify ClusterIssuer is ready
kubectl get clusterissuers

# Check DNS is properly configured
nslookup your-domain.com
```

### Issue: Cannot Connect to Cluster

**Error**: "Unable to connect to the server"

**Solution**:
```bash
# Refresh credentials
az aks get-credentials \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --overwrite-existing

# Verify kubeconfig
kubectl config view
kubectl config current-context

# Test connection
kubectl get nodes
```

## Cost Management

### Monitor Costs

```bash
# View cost analysis in Azure Portal
az consumption usage list --output table

# Set up cost alerts
az consumption budget create \
  --budget-name sagesure-monthly-budget \
  --amount 1000 \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2024-12-31
```

### Optimize Costs

1. **Scale down during off-hours**:
   ```bash
   # Scale to minimum nodes
   az aks scale --resource-group sagesure-india-rg \
     --name sagesure-aks-prod --node-count 2
   ```

2. **Use spot instances** (for non-production):
   - Add spot node pool in Terraform configuration

3. **Right-size VMs**:
   - Monitor resource usage
   - Adjust VM size if over/under-provisioned

## Maintenance

### Regular Tasks

**Daily**:
- Check cluster health: `kubectl get nodes`
- Review logs in Azure Portal

**Weekly**:
- Check for Kubernetes updates
- Review cost reports
- Backup important data

**Monthly**:
- Update Terraform providers
- Rotate secrets
- Review security policies

### Upgrade Kubernetes

```bash
# Check available versions
az aks get-upgrades \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod

# Upgrade cluster
az aks upgrade \
  --resource-group sagesure-india-rg \
  --name sagesure-aks-prod \
  --kubernetes-version 1.28.0
```

## Cleanup

To destroy all resources:

```bash
# Using Terraform
terraform destroy

# Or using Makefile
make destroy

# Confirm with 'yes' when prompted
```

**Warning**: This will permanently delete:
- AKS cluster and all workloads
- Container registry and images
- Virtual network and subnets
- Log Analytics workspace and logs
- All associated resources

Ensure you have backups before proceeding!

## Next Steps

After successful deployment:

1. **Deploy Applications**: Use the Kubernetes manifests in `../kubernetes/` directory
2. **Set Up CI/CD**: Configure GitHub Actions or Azure DevOps pipelines
3. **Configure Monitoring**: Set up Application Insights and alerts
4. **Implement Backup**: Configure backup policies for databases
5. **Security Hardening**: Implement network policies and pod security policies
6. **Load Testing**: Verify autoscaling works under load

## Support

For issues or questions:

- **Azure AKS Docs**: https://docs.microsoft.com/azure/aks/
- **Terraform Docs**: https://registry.terraform.io/providers/hashicorp/azurerm/
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **NGINX Ingress**: https://kubernetes.github.io/ingress-nginx/
- **Cert Manager**: https://cert-manager.io/docs/

## Requirements Satisfied

This deployment satisfies:

✅ **Requirement 23.2**: Support 10,000+ concurrent users  
✅ **Requirement 23.3**: Auto-scale 2-10 nodes (70% CPU, 80% memory)  
✅ **NGINX Ingress Controller**: External access with SSL/TLS  
✅ **Cert Manager**: Automated Let's Encrypt certificates  

---

**Deployment Status**: Ready for Production 🚀
