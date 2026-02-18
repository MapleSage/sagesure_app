# Terraform Fixes Applied

## Issues Fixed:

1. **Kubernetes Version**: Updated from 1.27 to 1.31.13 (supported in Central India)
2. **Service Endpoints**: Added to AKS subnet for Storage, KeyVault, and ContainerRegistry
3. **PostgreSQL**: Explicitly disabled public network access for VNet integration

## Next Steps:

Run this command to apply the fixes:

```bash
cd infrastructure/terraform
terraform apply -auto-approve
```

The deployment should now complete successfully!
