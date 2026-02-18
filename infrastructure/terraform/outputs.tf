# Terraform Outputs

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.id
}

output "aks_cluster_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.fqdn
}

output "aks_node_resource_group" {
  description = "Resource group containing AKS nodes"
  value       = azurerm_kubernetes_cluster.aks.node_resource_group
}

output "kube_config_raw" {
  description = "Raw kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive   = true
}

output "kube_config" {
  description = "Kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.kube_config
  sensitive   = true
}

output "acr_login_server" {
  description = "Login server for Azure Container Registry"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "Admin username for Azure Container Registry"
  value       = azurerm_container_registry.acr.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "Admin password for Azure Container Registry"
  value       = azurerm_container_registry.acr.admin_password
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.name
}

output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "aks_subnet_id" {
  description = "ID of the AKS subnet"
  value       = azurerm_subnet.aks.id
}

output "database_subnet_id" {
  description = "ID of the database subnet"
  value       = azurerm_subnet.database.id
}

output "nginx_ingress_ip" {
  description = "External IP address of the NGINX Ingress Controller LoadBalancer"
  value       = try(data.kubernetes_service.nginx_ingress.status[0].load_balancer[0].ingress[0].ip, "pending")
}

output "cluster_identity_principal_id" {
  description = "Principal ID of the AKS cluster managed identity"
  value       = azurerm_kubernetes_cluster.aks.identity[0].principal_id
}

output "kubelet_identity_object_id" {
  description = "Object ID of the kubelet managed identity"
  value       = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}

# Instructions for connecting to the cluster
output "connect_instructions" {
  description = "Instructions for connecting to the AKS cluster"
  value = <<-EOT
    To connect to the AKS cluster, run:
    
    az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_kubernetes_cluster.aks.name}
    
    Or save the kubeconfig:
    
    terraform output -raw kube_config_raw > ~/.kube/sagesure-config
    export KUBECONFIG=~/.kube/sagesure-config
    kubectl get nodes
    
    NGINX Ingress LoadBalancer IP: ${try(data.kubernetes_service.nginx_ingress.status[0].load_balancer[0].ingress[0].ip, "pending")}
    
    Configure your DNS A record to point to this IP address.
  EOT
}

# Managed Services Outputs

output "postgres_server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "postgres_server_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_ssl_port" {
  description = "SSL port of the Redis cache"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_primary_access_key" {
  description = "Primary access key for Redis cache"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.documents.name
}

output "storage_account_primary_endpoint" {
  description = "Primary blob endpoint of the storage account"
  value       = azurerm_storage_account.documents.primary_blob_endpoint
}

output "storage_containers" {
  description = "List of blob storage containers"
  value = {
    policies      = azurerm_storage_container.policies.name
    claims        = azurerm_storage_container.claims.name
    vault         = azurerm_storage_container.vault.name
    scam_evidence = azurerm_storage_container.scam_evidence.name
  }
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "document_encryption_key_id" {
  description = "ID of the document encryption key"
  value       = azurerm_key_vault_key.document_encryption.id
}

output "application_insights_name" {
  description = "Name of Application Insights"
  value       = azurerm_application_insights.main.name
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "application_insights_app_id" {
  description = "Application ID for Application Insights"
  value       = azurerm_application_insights.main.app_id
}

# Connection information summary
output "managed_services_summary" {
  description = "Summary of all managed services connection information"
  sensitive   = true
  value = <<-EOT
    === Azure Managed Services ===
    
    PostgreSQL:
      Server: ${azurerm_postgresql_flexible_server.main.fqdn}
      Database: ${azurerm_postgresql_flexible_server_database.main.name}
      Username: ${var.postgres_admin_username}
      Connection: Stored in Key Vault as 'postgres-connection-string'
    
    Redis:
      Hostname: ${azurerm_redis_cache.main.hostname}
      Port: ${azurerm_redis_cache.main.ssl_port}
      Connection: Stored in Key Vault as 'redis-connection-string'
    
    Blob Storage:
      Account: ${azurerm_storage_account.documents.name}
      Endpoint: ${azurerm_storage_account.documents.primary_blob_endpoint}
      Containers: policies, claims, vault, scam-evidence
      Connection: Stored in Key Vault as 'storage-connection-string'
    
    Key Vault:
      Name: ${azurerm_key_vault.main.name}
      URI: ${azurerm_key_vault.main.vault_uri}
      Encryption Key: document-encryption-key
    
    Application Insights:
      Name: ${azurerm_application_insights.main.name}
      App ID: ${azurerm_application_insights.main.app_id}
      Connection: Stored in Key Vault as 'appinsights-connection-string'
    
    Log Analytics:
      Workspace: ${azurerm_log_analytics_workspace.main.name}
      ID: ${azurerm_log_analytics_workspace.main.workspace_id}
    
    All connection strings are securely stored in Azure Key Vault.
    Access them using: az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name <secret-name>
  EOT
}
