# Azure Container Registry Configuration

resource "azurerm_container_registry" "acr" {
  name                = "${replace(var.project_name, "-", "")}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  admin_enabled       = true

  # Note: Retention policy requires Premium SKU, removed for Standard SKU
  # retention_policy {
  #   days    = 30
  #   enabled = true
  # }

  # Trust policy
  trust_policy {
    enabled = false
  }

  tags = var.tags
}
