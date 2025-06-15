terraform {
  required_version = ">= 1.0"
  
  # backend "gcs" {
  #   bucket = "emubench-terraform-state"
  #   prefix = "terraform/state"
  # }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.30.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
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

data "google_client_config" "default" {}

# Google Service Account for Cloud Run service
resource "google_service_account" "cloud_run_sa" {
  account_id   = "emubench-cloud-run-sa"
  display_name = "Emubench Cloud Run Service Account"
  description  = "Service account for Cloud Run service with GKE cluster access"
}

resource "google_project_iam_member" "cloud_run_artifact_registry_reader" {
  project = var.project_id
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
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions to write logs
resource "google_project_iam_member" "cloud_build_logs_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions for Cloud Run deployment
resource "google_project_iam_member" "cloud_build_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions to use other service accounts
resource "google_project_iam_member" "cloud_build_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account permissions for Artifact Registry
resource "google_project_iam_member" "cloud_build_artifact_registry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Grant Cloud Build service account additional permissions for Container Registry
resource "google_project_iam_member" "cloud_build_storage_object_admin" {
  project = var.project_id
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

# TODO: too broad
resource "google_storage_bucket_iam_member" "emubench_sessions_cloud_run_admin" {
  bucket = google_storage_bucket.emubench_sessions.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant storage permissions to Cloud Run service account for spinning up other cloud run containers
resource "google_project_iam_member" "cloud_run_developer" {
  project = var.project_id
  role   = "roles/run.developer"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant Cloud Run service account permissions to use other service accounts
resource "google_project_iam_member" "cloud_run_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant Cloud Run service account permissions to invoke other Cloud Run services
resource "google_project_iam_member" "cloud_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "emubench_serv" {
  name                 = "emubench-serv"
  location             = "us-central1"
  invoker_iam_disabled = true

  template {
    containers {
      image = "gcr.io/emubench-459802/emubench-serv"
      
      ports {
        container_port = 8080
      }

      volume_mounts {
        name       = "emubench-sessions"
        mount_path = "/tmp/gcs/emubench-sessions"
      }
      
      env {
        name  = "PROJECT_ID"
        value = var.project_id
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
        name  = "MAX_CONCURRENT_CONTAINERS"
        value = "5"
      }
      
      env {
        name  = "CONTAINER_TIMEOUT_MINUTES"
        value = "30"
      }
      
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
    }
    volumes {
      name = "emubench-sessions"
      gcs {
        bucket    = google_storage_bucket.emubench_sessions.name
        read_only = false
      }
    }
    
    service_account = google_service_account.cloud_run_sa.email
  }

  # Ensure the service account is created first
  depends_on = [google_service_account.cloud_run_sa]
  ingress = "INGRESS_TRAFFIC_ALL"
}
