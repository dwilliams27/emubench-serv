terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "emubench-terraform-state"
    prefix = "terraform/state"
  }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "google" {
  project = "emubench-459802"
  region  = var.region
}

resource "google_project_service" "container" {
  service = "container.googleapis.com"
}

resource "google_project_service" "compute" {
  service = "compute.googleapis.com"
}

resource "google_project_service" "cloudbuild" {
  service = "cloudbuild.googleapis.com"
}

resource "google_project_service" "run" {
  service = "run.googleapis.com"
}

resource "google_project_service" "vpcaccess" {
  service = "vpcaccess.googleapis.com"
}

resource "google_compute_network" "vpc" {
  name                    = "${var.cluster_name}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.compute]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.cluster_name}-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.name

  # Enable private Google access for nodes to reach Google APIs
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Subnet for VPC connector
resource "google_compute_subnetwork" "vpc_connector" {
  name          = "emubench-vpc-connector-subnet"
  ip_cidr_range = "10.3.0.0/28"  # Small subnet for VPC connector
  region        = var.region
  network       = google_compute_network.vpc.name
}

# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name           = "emubench-vpc-connector"
  region         = var.region
  
  subnet {
    name = google_compute_subnetwork.vpc_connector.name
  }
  
  # Machine type and scaling
  machine_type   = "e2-micro"
  min_instances  = 2
  max_instances  = 3
  
  depends_on = [
    google_project_service.vpcaccess,
    google_compute_subnetwork.vpc_connector
  ]
}

# Firewall rule to allow VPC connector to access GKE master
resource "google_compute_firewall" "allow_vpc_connector_to_gke" {
  name    = "${var.cluster_name}-allow-vpc-connector-to-gke"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443", "10250"]
  }

  source_ranges = [google_compute_subnetwork.vpc_connector.ip_cidr_range]
  target_tags   = ["gke-${var.cluster_name}"]
  
  description = "Allow VPC connector to access GKE master and nodes"
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.zones[0]  # Use first zone as primary location

  # We can't create a cluster with no node pool defined, but we want to only use separately managed node pools
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Keep public endpoint for Cloud Run access
    master_ipv4_cidr_block  = "172.16.0.0/28"
    
    master_global_access_config {
      enabled = true  # Allow access from other regions
    }
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = google_compute_subnetwork.vpc_connector.ip_cidr_range
      display_name = "VPC Connector Subnet"
    }
    # cidr_blocks {
    #   cidr_block   = "X.X.X.X/32"
    #   display_name = "Development machine"
    # }
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity for better security
  workload_identity_config {
    workload_pool = "emubench-459802.svc.id.goog"
  }

  # Enable Cloud Storage FUSE CSI driver
  addons_config {
    gcs_fuse_csi_driver_config {
      enabled = true
    }
  }

  depends_on = [
    google_project_service.container,
    google_project_service.compute,
  ]
}

# Google Service Account for node pool
resource "google_service_account" "gke_node_pool_sa" {
  account_id   = "gke-node-pool-sa"
  display_name = "GKE Node Pool Service Account"
  description  = "Service account for GKE node pool with image pulling permissions"
}

# Grant necessary permissions to the node pool service account
resource "google_project_iam_member" "gke_node_pool_default_service_account" {
  project = "emubench-459802"
  role    = "roles/container.defaultNodeServiceAccount"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

resource "google_project_iam_member" "gke_node_pool_storage_object_viewer" {
  project = "emubench-459802"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

resource "google_project_iam_member" "gke_node_pool_artifact_registry_reader" {
  project = "emubench-459802"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

resource "google_project_iam_member" "gke_node_pool_log_writer" {
  project = "emubench-459802"
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

resource "google_project_iam_member" "gke_node_pool_monitoring_metric_writer" {
  project = "emubench-459802"
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

resource "google_project_iam_member" "gke_node_pool_monitoring_resource_metadata_writer" {
  project = "emubench-459802"
  role    = "roles/stackdriver.resourceMetadata.writer"
  member  = "serviceAccount:${google_service_account.gke_node_pool_sa.email}"
}

# Spot node pool for all workloads
resource "google_container_node_pool" "arm_spot_nodes" {
  name       = "arm-spot-node-pool"
  location   = var.zones[0]
  cluster    = google_container_cluster.primary.name
  node_count = 0

  node_locations = var.zones

  autoscaling {
    min_node_count = 0
    max_node_count = 2
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    spot = true
    
    machine_type = "t2a-standard-2"
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    
    service_account = google_service_account.gke_node_pool_sa.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/servicecontrol",
      "https://www.googleapis.com/auth/service.management.readonly",
      "https://www.googleapis.com/auth/trace.append",
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      architecture = "arm64"
      instance-type = "spot"
    }

    taint {
      key    = "architecture"
      value  = "arm64"
      effect = "NO_SCHEDULE"
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
}

# Google Service Account for Workload Identity
resource "google_service_account" "emubench_workload_sa" {
  account_id   = "emubench-workload-sa"
  display_name = "Emubench Workload Service Account"
  description  = "Service account for emubench workload with container registry access"
}

# Grant necessary permissions to the workload service account
resource "google_project_iam_member" "emubench_workload_storage_object_viewer" {
  project = "emubench-459802"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.emubench_workload_sa.email}"
}

resource "google_project_iam_member" "emubench_workload_artifact_registry_reader" {
  project = "emubench-459802"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.emubench_workload_sa.email}"
}

# Grant storage permissions to the workload service account for FUSE mounting
resource "google_project_iam_member" "emubench_workload_storage_admin" {
  project = "emubench-459802"
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.emubench_workload_sa.email}"
}

# Google Service Account for Cloud Run service
resource "google_service_account" "cloud_run_sa" {
  account_id   = "emubench-cloud-run-sa"
  display_name = "Emubench Cloud Run Service Account"
  description  = "Service account for Cloud Run service with GKE cluster access"
}

resource "google_project_iam_member" "cloud_run_gke_developer" {
  project = "emubench-459802"
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_artifact_registry_reader" {
  project = "emubench-459802"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Google Service Account for Cloud Build
resource "google_service_account" "cloud_build_sa" {
  account_id   = "emubench-cloud-build-sa"
  display_name = "Emubench Cloud Build Service Account"
  description  = "Service account for Cloud Build with container registry and logging permissions"
}

# Grant Cloud Build service account permissions to push to Container Registry
resource "google_project_iam_member" "cloud_build_storage_admin" {
  project = "emubench-459802"
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions to write logs
resource "google_project_iam_member" "cloud_build_logs_writer" {
  project = "emubench-459802"
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions for Cloud Run deployment
resource "google_project_iam_member" "cloud_build_run_developer" {
  project = "emubench-459802"
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions to use other service accounts
resource "google_project_iam_member" "cloud_build_service_account_user" {
  project = "emubench-459802"
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions for Artifact Registry
resource "google_project_iam_member" "cloud_build_artifact_registry_writer" {
  project = "emubench-459802"
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account additional permissions for Container Registry
resource "google_project_iam_member" "cloud_build_storage_object_admin" {
  project = "emubench-459802"
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Google Cloud Storage bucket for screenshots and session data
resource "google_storage_bucket" "emubench_sessions" {
  name     = "emubench-sessions"
  location = "US"
  
  # Enable uniform bucket-level access for better security
  uniform_bucket_level_access = true
  
  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
  
  # Enable versioning for important data
  versioning {
    enabled = true
  }
}

# Grant storage permissions to workload service account for bucket access
resource "google_storage_bucket_iam_member" "emubench_sessions_workload_admin" {
  bucket = google_storage_bucket.emubench_sessions.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.emubench_workload_sa.email}"
}

# Grant storage permissions to Cloud Run service account for bucket access (if needed)
resource "google_storage_bucket_iam_member" "emubench_sessions_cloud_run_admin" {
  bucket = google_storage_bucket.emubench_sessions.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}


# Create dedicated namespace for emulator containers
resource "kubernetes_namespace" "emubench_containers" {
  metadata {
    name = "emubench-containers"
    labels = {
      purpose = "emulator-sessions"
    }
  }
}

# Service account specifically for emulator container management
resource "kubernetes_service_account" "emubench_container_manager" {
  metadata {
    name      = "emubench-container-manager-sa"
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.cloud_run_sa.email
    }
  }
}

# Allow the Cloud Run service account to impersonate the Kubernetes service account
resource "google_service_account_iam_member" "cloud_run_workload_identity" {
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:emubench-459802.svc.id.goog[${kubernetes_namespace.emubench_containers.metadata[0].name}/${kubernetes_service_account.emubench_container_manager.metadata[0].name}]"
}

# Restrictive role that only allows pod management in the emubench namespace
resource "kubernetes_role" "emubench_container_manager" {
  metadata {
    name      = "emubench-container-manager"
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "pods/log", "pods/exec"]
    verbs      = ["create", "delete", "get", "list", "watch"]
  }

  rule {
    api_groups = [""]
    resources  = ["services"]
    verbs      = ["create", "delete", "get", "list"]
  }

  # Limit to only reading configmaps/secrets, not creating them
  rule {
    api_groups = [""]
    resources  = ["configmaps", "secrets"]
    verbs      = ["get", "list"]
  }
}

# Bind the role to the service account
resource "kubernetes_role_binding" "emubench_container_manager" {
  metadata {
    name      = "emubench-container-manager-binding"
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.emubench_container_manager.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.emubench_container_manager.metadata[0].name
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
  }
}

resource "kubernetes_resource_quota" "emubench_containers_quota" {
  metadata {
    name      = "emubench-containers-quota"
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "4"      # Max 4 CPU cores
      "requests.memory" = "8Gi"    # Max 8GB RAM
      "limits.cpu"      = "8"      # Max 8 CPU cores burst
      "limits.memory"   = "16Gi"   # Max 16GB RAM burst
      "pods"           = "10"      # Max 10 concurrent pods
      "persistentvolumeclaims" = "0"  # No persistent storage
    }
  }
}

resource "kubernetes_network_policy" "emubench_containers_network_policy" {
  metadata {
    name      = "emubench-containers-network-policy"
    namespace = kubernetes_namespace.emubench_containers.metadata[0].name
  }

  spec {
    pod_selector {}
    
    policy_types = ["Egress"]
    
    # Allow DNS resolution
    egress {
      ports {
        port     = "53"
        protocol = "UDP"
      }
      to {
        namespace_selector {}
      }
    }
    
    # Allow HTTPS to Google APIs only
    egress {
      ports {
        port     = "443"
        protocol = "TCP"
      }
      to {
        ip_block {
          cidr = "0.0.0.0/0"
          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16"
          ]
        }
      }
    }
  }
}

# Cloud Run service
resource "google_cloud_run_service" "emubench_serv" {
  name     = "emubench-serv"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/emubench-459802/emubench-serv"
        
        ports {
          container_port = 8080
        }
        
        env {
          name  = "GKE_CLUSTER_NAME"
          value = google_container_cluster.primary.name
        }
        
        env {
          name  = "GKE_CLUSTER_LOCATION"
          value = google_container_cluster.primary.location
        }
        
        env {
          name  = "PROJECT_ID"
          value = "emubench-459802"
        }
        
        env {
          name  = "DB_PASSWORD"
          value = var.db_password
        }
        
        env {
          name  = "DB_SERVICE_ROLE_KEY"
          value = var.db_service_role_key
        }
        
        env {
          name  = "DB_URL"
          value = var.db_url
        }
        
        env {
          name  = "SUPABASE_URL"
          value = var.supabase_url
        }
        
        env {
          name  = "SUPABASE_ANON_KEY"
          value = var.supabase_anon_key
        }
        
        env {
          name  = "SUPABASE_SERVICE_ROLE_KEY"
          value = var.supabase_service_role_key
        }
        
        env {
          name  = "GOOGLE_CLIENT_ID"
          value = var.google_client_id
        }
        
        env {
          name  = "EMUBENCH_NAMESPACE"
          value = kubernetes_namespace.emubench_containers.metadata[0].name
        }
        
        env {
          name  = "EMUBENCH_SERVICE_ACCOUNT"
          value = kubernetes_service_account.emubench_container_manager.metadata[0].name
        }
        
        env {
          name  = "MAX_CONCURRENT_CONTAINERS"
          value = "5"
        }
        
        env {
          name  = "CONTAINER_TIMEOUT_MINUTES"
          value = "30"
        }
        
        env {
          name  = "USE_PRIVATE_ENDPOINT"
          value = "true"
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
      
      service_account_name = google_service_account.cloud_run_sa.email
      
      # Allow up to 40 concurrent instances
      container_concurrency = 80
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "40"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
        "run.googleapis.com/vpc-access-egress" = "private-ranges-only"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # Ensure the service account is created first
  depends_on = [google_service_account.cloud_run_sa]
}
