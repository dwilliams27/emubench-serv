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

# Workload Identity binding
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.emubench_workload_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:emubench-459802.svc.id.goog[default/emubench-serv-sa]"
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
