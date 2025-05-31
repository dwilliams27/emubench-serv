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

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
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

# Grant GKE cluster access to Cloud Run service account
resource "google_project_iam_member" "cloud_run_gke_admin" {
  project = "emubench-459802"
  role    = "roles/container.clusterAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant container admin permissions to manage pods
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

resource "kubernetes_service_account" "emubench_serv" {
  metadata {
    name      = "emubench-serv-sa"
    namespace = "default"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.emubench_workload_sa.email
    }
  }
}

resource "kubernetes_cluster_role" "container_manager" {
  metadata {
    name = "container-manager"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["create", "delete", "get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["create", "delete", "get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "emubench_serv_container_manager" {
  metadata {
    name = "emubench-serv-container-manager"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.container_manager.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.emubench_serv.metadata[0].name
    namespace = "default"
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
          name  = "GCP_PROJECT_ID"
          value = "emubench-459802"
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

# Grant access to authorized users
resource "google_cloud_run_service_iam_member" "allow_authorized_users" {
  for_each = toset(var.authorized_emails)
  service  = google_cloud_run_service.emubench_serv.name
  location = google_cloud_run_service.emubench_serv.location
  role     = "roles/run.invoker"
  member   = "user:${each.value}"
}
