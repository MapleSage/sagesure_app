# NGINX Ingress Controller and Cert Manager Configuration
# Requirements: 23.2, 23.3

# Kubernetes namespace for ingress
resource "kubernetes_namespace" "ingress_nginx" {
  metadata {
    name = "ingress-nginx"
    labels = {
      name = "ingress-nginx"
    }
  }

  depends_on = [azurerm_kubernetes_cluster.aks]
}

# Kubernetes namespace for cert-manager
resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = "cert-manager"
    labels = {
      name = "cert-manager"
    }
  }

  depends_on = [azurerm_kubernetes_cluster.aks]
}

# Install NGINX Ingress Controller using Helm
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.8.3"
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name

  set {
    name  = "controller.replicaCount"
    value = "2"
  }

  set {
    name  = "controller.nodeSelector.workload"
    value = "general"
  }

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-health-probe-request-path"
    value = "/healthz"
  }

  # Resource limits for ingress controller
  set {
    name  = "controller.resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "controller.resources.requests.memory"
    value = "128Mi"
  }

  set {
    name  = "controller.resources.limits.cpu"
    value = "500m"
  }

  set {
    name  = "controller.resources.limits.memory"
    value = "512Mi"
  }

  # Enable metrics for monitoring
  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  set {
    name  = "controller.metrics.serviceMonitor.enabled"
    value = "true"
  }

  # Autoscaling configuration
  # Requirement 23.3: HPA with 2-10 nodes, 70% CPU, 80% memory
  set {
    name  = "controller.autoscaling.enabled"
    value = "true"
  }

  set {
    name  = "controller.autoscaling.minReplicas"
    value = var.hpa_min_replicas
  }

  set {
    name  = "controller.autoscaling.maxReplicas"
    value = var.hpa_max_replicas
  }

  set {
    name  = "controller.autoscaling.targetCPUUtilizationPercentage"
    value = var.hpa_cpu_threshold
  }

  set {
    name  = "controller.autoscaling.targetMemoryUtilizationPercentage"
    value = var.hpa_memory_threshold
  }

  depends_on = [
    azurerm_kubernetes_cluster.aks,
    kubernetes_namespace.ingress_nginx
  ]
}

# Install Cert Manager using Helm
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "v1.13.2"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name

  # Install CRDs
  set {
    name  = "installCRDs"
    value = "true"
  }

  # Resource limits
  set {
    name  = "resources.requests.cpu"
    value = "10m"
  }

  set {
    name  = "resources.requests.memory"
    value = "32Mi"
  }

  set {
    name  = "resources.limits.cpu"
    value = "100m"
  }

  set {
    name  = "resources.limits.memory"
    value = "128Mi"
  }

  # Enable Prometheus metrics
  set {
    name  = "prometheus.enabled"
    value = "true"
  }

  depends_on = [
    azurerm_kubernetes_cluster.aks,
    kubernetes_namespace.cert_manager
  ]
}

# Let's Encrypt ClusterIssuer for staging (testing)
# Note: Apply these manually after cluster is ready using kubectl
# resource "kubernetes_manifest" "letsencrypt_staging" {
#   manifest = {
#     apiVersion = "cert-manager.io/v1"
#     kind       = "ClusterIssuer"
#     metadata = {
#       name = "letsencrypt-staging"
#     }
#     spec = {
#       acme = {
#         server = "https://acme-staging-v02.api.letsencrypt.org/directory"
#         email  = var.letsencrypt_email
#         privateKeySecretRef = {
#           name = "letsencrypt-staging"
#         }
#         solvers = [
#           {
#             http01 = {
#               ingress = {
#                 class = "nginx"
#               }
#             }
#           }
#         ]
#       }
#     }
#   }
#
#   depends_on = [helm_release.cert_manager]
# }

# Let's Encrypt ClusterIssuer for production
# Note: Apply these manually after cluster is ready using kubectl
# resource "kubernetes_manifest" "letsencrypt_production" {
#   manifest = {
#     apiVersion = "cert-manager.io/v1"
#     kind       = "ClusterIssuer"
#     metadata = {
#       name = "letsencrypt-production"
#     }
#     spec = {
#       acme = {
#         server = "https://acme-v02.api.letsencrypt.org/directory"
#         email  = var.letsencrypt_email
#         privateKeySecretRef = {
#           name = "letsencrypt-production"
#         }
#         solvers = [
#           {
#             http01 = {
#               ingress = {
#                 class = "nginx"
#               }
#             }
#           }
#         ]
#       }
#     }
#   }
#
#   depends_on = [helm_release.cert_manager]
# }

# Output the LoadBalancer IP for DNS configuration
data "kubernetes_service" "nginx_ingress" {
  metadata {
    name      = "ingress-nginx-controller"
    namespace = kubernetes_namespace.ingress_nginx.metadata[0].name
  }

  depends_on = [helm_release.nginx_ingress]
}
