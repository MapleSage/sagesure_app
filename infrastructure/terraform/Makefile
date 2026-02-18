# SageSure India Platform - Terraform Makefile
# Simplifies common Terraform operations

.PHONY: help init plan apply destroy validate fmt clean check-azure

# Default target
help:
	@echo "SageSure India Platform - Terraform Commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make init          - Initialize Terraform"
	@echo "  make validate      - Validate Terraform configuration"
	@echo "  make fmt           - Format Terraform files"
	@echo "  make plan          - Create execution plan"
	@echo "  make apply         - Apply Terraform configuration"
	@echo "  make destroy       - Destroy all resources"
	@echo "  make output        - Show Terraform outputs"
	@echo "  make clean         - Clean Terraform files"
	@echo "  make check-azure   - Check Azure CLI login status"
	@echo "  make kubeconfig    - Save kubeconfig to file"
	@echo ""

# Check if logged into Azure
check-azure:
	@echo "Checking Azure CLI login status..."
	@az account show > /dev/null 2>&1 || (echo "Error: Not logged into Azure. Run 'az login' first." && exit 1)
	@echo "✓ Logged into Azure"
	@az account show --query "{Subscription:name, ID:id}" -o table

# Initialize Terraform
init: check-azure
	@echo "Initializing Terraform..."
	terraform init
	@echo "✓ Terraform initialized"

# Validate configuration
validate:
	@echo "Validating Terraform configuration..."
	terraform validate
	@echo "✓ Configuration is valid"

# Format Terraform files
fmt:
	@echo "Formatting Terraform files..."
	terraform fmt -recursive
	@echo "✓ Files formatted"

# Create execution plan
plan: check-azure validate
	@echo "Creating Terraform execution plan..."
	terraform plan -out=tfplan
	@echo "✓ Plan created: tfplan"
	@echo ""
	@echo "Review the plan above. To apply, run: make apply"

# Apply configuration
apply: check-azure
	@echo "Applying Terraform configuration..."
	@if [ ! -f tfplan ]; then \
		echo "Error: No plan file found. Run 'make plan' first."; \
		exit 1; \
	fi
	terraform apply tfplan
	@rm -f tfplan
	@echo "✓ Infrastructure deployed successfully"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'make kubeconfig' to save kubeconfig"
	@echo "  2. Run 'make output' to view outputs"
	@echo "  3. Configure DNS with the LoadBalancer IP"

# Show outputs
output:
	@echo "Terraform Outputs:"
	@echo ""
	terraform output

# Save kubeconfig
kubeconfig:
	@echo "Saving kubeconfig..."
	@mkdir -p ~/.kube
	terraform output -raw kube_config_raw > ~/.kube/sagesure-config
	@echo "✓ Kubeconfig saved to ~/.kube/sagesure-config"
	@echo ""
	@echo "To use this kubeconfig:"
	@echo "  export KUBECONFIG=~/.kube/sagesure-config"
	@echo "  kubectl get nodes"

# Destroy infrastructure
destroy: check-azure
	@echo "WARNING: This will destroy all infrastructure!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	terraform destroy
	@echo "✓ Infrastructure destroyed"

# Clean Terraform files
clean:
	@echo "Cleaning Terraform files..."
	rm -rf .terraform
	rm -f .terraform.lock.hcl
	rm -f tfplan
	rm -f terraform.tfstate.backup
	@echo "✓ Cleaned"

# Full deployment workflow
deploy: init plan apply output kubeconfig
	@echo ""
	@echo "=========================================="
	@echo "Deployment Complete!"
	@echo "=========================================="
	@echo ""
	@echo "Your AKS cluster is ready. Next steps:"
	@echo ""
	@echo "1. Set kubeconfig:"
	@echo "   export KUBECONFIG=~/.kube/sagesure-config"
	@echo ""
	@echo "2. Verify cluster:"
	@echo "   kubectl get nodes"
	@echo "   kubectl get namespaces"
	@echo ""
	@echo "3. Check ingress:"
	@echo "   kubectl get svc -n ingress-nginx"
	@echo ""
	@echo "4. Get LoadBalancer IP:"
	@echo "   kubectl get svc ingress-nginx-controller -n ingress-nginx"
	@echo ""
	@echo "5. Configure DNS A record with the LoadBalancer IP"
	@echo ""
