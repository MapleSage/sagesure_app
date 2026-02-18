# Variables for SageSure India Platform Infrastructure

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "sagesure-india-rg"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "southeastasia"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sagesure-india"
}

# AKS Configuration
variable "aks_cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "sagesure-aks-prod"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.31.13"
}

variable "aks_node_count" {
  description = "Initial number of nodes in the AKS cluster"
  type        = number
  default     = 3
}

variable "aks_node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v3" # 4 vCPU, 16GB RAM
}

variable "aks_node_disk_size_gb" {
  description = "Disk size for AKS nodes in GB"
  type        = number
  default     = 128
}

variable "aks_min_node_count" {
  description = "Minimum number of nodes for autoscaling"
  type        = number
  default     = 2
}

variable "aks_max_node_count" {
  description = "Maximum number of nodes for autoscaling"
  type        = number
  default     = 10
}

# Networking
variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "aks_subnet_address_prefix" {
  description = "Address prefix for AKS subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "database_subnet_address_prefix" {
  description = "Address prefix for database subnet"
  type        = string
  default     = "10.0.2.0/24"
}

# Horizontal Pod Autoscaler Configuration
variable "hpa_cpu_threshold" {
  description = "CPU utilization threshold for HPA"
  type        = number
  default     = 70
}

variable "hpa_memory_threshold" {
  description = "Memory utilization threshold for HPA"
  type        = number
  default     = 80
}

variable "hpa_min_replicas" {
  description = "Minimum number of pod replicas"
  type        = number
  default     = 2
}

variable "hpa_max_replicas" {
  description = "Maximum number of pod replicas"
  type        = number
  default     = 10
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "SageSure India"
    Environment = "Production"
    ManagedBy   = "Terraform"
    Owner       = "Platform Team"
  }
}

# Let's Encrypt Configuration
variable "letsencrypt_email" {
  description = "Email address for Let's Encrypt certificate notifications"
  type        = string
  default     = "admin@sagesure.in"
}

variable "letsencrypt_environment" {
  description = "Let's Encrypt environment (staging or production)"
  type        = string
  default     = "production"
}

# PostgreSQL Configuration
variable "postgres_admin_username" {
  description = "Administrator username for PostgreSQL"
  type        = string
  default     = "sagesure_admin"
  sensitive   = true
}

variable "postgres_admin_password" {
  description = "Administrator password for PostgreSQL"
  type        = string
  sensitive   = true
}
