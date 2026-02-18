# Azure Managed Services Configuration
# Requirements: 2.4, 13.2
# Task 2.2: PostgreSQL, Redis, Blob Storage, Key Vault, Application Insights

# PostgreSQL 15 Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-postgres"
  location               = azurerm_resource_group.main.location
  resource_group_name    = azurerm_resource_group.main.name
  version                = "15"
  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password

  storage_mb                   = 131072               # 128GB (closest to 100GB from allowed values)
  sku_name                     = "GP_Standard_D4s_v3" # 4 vCores, 16GB RAM
  backup_retention_days        = 7
  geo_redundant_backup_enabled = true

  delegated_subnet_id = azurerm_subnet.database.id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id
  
  # Disable public network access when using VNet integration
  public_network_access_enabled = false

  # Disable high availability for initial deployment to avoid zone issues
  # high_availability {
  #   mode                      = "ZoneRedundant"
  #   standby_availability_zone = "2"
  # }

  maintenance_window {
    day_of_week  = 0 # Sunday
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "sagesure_india"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# PostgreSQL Configuration for performance
resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "500"
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "4096" # 4GB in 8KB pages
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.project_name}-postgres-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.tags
}

# Azure Cache for Redis (1GB)
resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy                = "allkeys-lru"
    maxmemory_reserved              = 50
    maxfragmentationmemory_reserved = 50
  }

  tags = var.tags
}

# Azure Blob Storage Account for documents
resource "azurerm_storage_account" "documents" {
  name                     = "${replace(var.project_name, "-", "")}docs"
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = "Standard"
  account_replication_type = "GRS" # Geo-redundant storage
  account_kind             = "StorageV2"

  min_tls_version                 = "TLS1_2"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action             = "Allow"  # Allow public access during initial deployment
    bypass                     = ["AzureServices"]
    # virtual_network_subnet_ids = [azurerm_subnet.aks.id]  # Enable after AKS is created
  }

  tags = var.tags
}

# Blob Container for policy documents
resource "azurerm_storage_container" "policies" {
  name                  = "policies"
  storage_account_name  = azurerm_storage_account.documents.name
  container_access_type = "private"
}

# Blob Container for claim documents
resource "azurerm_storage_container" "claims" {
  name                  = "claims"
  storage_account_name  = azurerm_storage_account.documents.name
  container_access_type = "private"
}

# Blob Container for sovereign vault documents
resource "azurerm_storage_container" "vault" {
  name                  = "vault"
  storage_account_name  = azurerm_storage_account.documents.name
  container_access_type = "private"
}

# Blob Container for scam evidence
resource "azurerm_storage_container" "scam_evidence" {
  name                  = "scam-evidence"
  storage_account_name  = azurerm_storage_account.documents.name
  container_access_type = "private"
}

# Azure Key Vault for secrets and encryption keys
resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium" # Premium for HSM-backed keys
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  enabled_for_deployment          = false
  enabled_for_disk_encryption     = false
  enabled_for_template_deployment = false

  network_acls {
    default_action             = "Allow"  # Allow public access during initial deployment
    bypass                     = "AzureServices"
    # virtual_network_subnet_ids = [azurerm_subnet.aks.id]  # Enable after AKS is created
  }

  tags = var.tags
}

# Key Vault Access Policy for AKS cluster identity
resource "azurerm_key_vault_access_policy" "aks" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id

  key_permissions = [
    "Get",
    "List",
    "Encrypt",
    "Decrypt",
    "WrapKey",
    "UnwrapKey"
  ]

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Key Vault Access Policy for current user/service principal (for Terraform)
resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Update",
    "Encrypt",
    "Decrypt",
    "WrapKey",
    "UnwrapKey",
    "Purge",
    "Recover",
    "GetRotationPolicy",
    "SetRotationPolicy"
  ]

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Purge",
    "Recover"
  ]

  certificate_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Update",
    "Purge",
    "Recover"
  ]
}

# Key Vault Access Policy for Application Insights (monitoring)
# Note: Application Insights doesn't have a managed identity/object_id
# Access to secrets will be through the AKS identity instead
# resource "azurerm_key_vault_access_policy" "monitoring" {
#   key_vault_id = azurerm_key_vault.main.id
#   tenant_id    = data.azurerm_client_config.current.tenant_id
#   object_id    = azurerm_application_insights.main.id
#
#   secret_permissions = [
#     "Get",
#     "List"
#   ]
# }

# Key Vault Access Policy for worker pods (using AKS identity)
resource "azurerm_key_vault_access_policy" "workers" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id

  key_permissions = [
    "Get",
    "List",
    "Encrypt",
    "Decrypt"
  ]

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Master encryption key for document encryption
resource "azurerm_key_vault_key" "document_encryption" {
  name         = "document-encryption-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA-HSM"
  key_size     = 4096

  key_opts = [
    "encrypt",
    "decrypt",
    "wrapKey",
    "unwrapKey"
  ]

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Store PostgreSQL connection string in Key Vault
resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name         = "postgres-connection-string"
  value        = "postgresql://${var.postgres_admin_username}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/sagesure_india?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Store Redis connection string in Key Vault
resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port}"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Store Storage Account connection string in Key Vault
resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.documents.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Application Insights for monitoring
resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-appinsights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  retention_in_days   = 90

  tags = var.tags
}

# Store Application Insights instrumentation key in Key Vault
resource "azurerm_key_vault_secret" "appinsights_instrumentation_key" {
  name         = "appinsights-instrumentation-key"
  value        = azurerm_application_insights.main.instrumentation_key
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Store Application Insights connection string in Key Vault
resource "azurerm_key_vault_secret" "appinsights_connection_string" {
  name         = "appinsights-connection-string"
  value        = azurerm_application_insights.main.connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]

  tags = var.tags
}

# Role assignment for AKS to access Storage Account
resource "azurerm_role_assignment" "aks_storage" {
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name = "Storage Blob Data Contributor"
  scope                = azurerm_storage_account.documents.id
}
