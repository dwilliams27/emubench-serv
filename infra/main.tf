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

resource "google_project_service" "cloudfunctions" {
  service = "cloudfunctions.googleapis.com"
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

resource "google_service_account" "thumbnail_function_sa" {
  account_id   = "thumbnail-function-sa"
  display_name = "Thumbnail Function Service Account"
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

resource "google_project_iam_member" "cloud_run_eventarc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Firestore
resource "google_project_iam_member" "cloud_run_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "thumbnail_function_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.thumbnail_function_sa.email}"
}

resource "google_project_iam_member" "thumbnail_function_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.thumbnail_function_sa.email}"
}

resource "google_service_account_iam_member" "thumbnail_function_token_creator" {
  service_account_id = google_service_account.thumbnail_function_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.thumbnail_function_sa.email}"
}

resource "google_cloudfunctions2_function" "thumbnail_generator" {
  name     = "thumbnail-generator"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "thumbnail-generator"
    source {
      storage_source {
        bucket = google_storage_bucket_object.function_source.bucket
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count               = 100
    available_memory                 = "512M"
    timeout_seconds                  = 60
    service_account_email            = google_service_account.thumbnail_function_sa.email
    ingress_settings                 = "ALLOW_INTERNAL_ONLY"
    all_traffic_on_latest_revision   = true
  }

  event_trigger {
    trigger_region        = "us"
    event_type            = "google.cloud.storage.object.v1.finalized"
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.thumbnail_function_sa.email
    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.emubench_sessions.name
    }
  }

  depends_on = [
    google_project_iam_member.thumbnail_function_eventarc_receiver,
    google_project_iam_member.compute_eventarc_admin,
    google_project_service.eventarc,
    google_project_iam_member.gcs_pubsub_publisher,
  ]
}

resource "google_project_iam_member" "gcs_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gs-project-accounts.iam.gserviceaccount.com"
}

data "archive_file" "function_source" {
  type        = "zip"
  output_path = "/tmp/function-source.zip"
  source_dir  = "${path.module}/../functions/thumbnail-generator"
}

resource "google_storage_bucket" "function_source_bucket" {
  name     = "${var.project_id}-function-source"
  location = var.region
  
  uniform_bucket_level_access = true
  
  # Clean up old function sources after 7 days
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_object" "function_source" {
  name   = "functions/thumbnail-generator-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source_bucket.name
  source = data.archive_file.function_source.output_path
}

resource "google_cloud_run_v2_service_iam_member" "eventarc_invoker" {
  project  = google_cloudfunctions2_function.thumbnail_generator.project
  location = google_cloudfunctions2_function.thumbnail_generator.location
  name     = google_cloudfunctions2_function.thumbnail_generator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.thumbnail_function_sa.email}"
}

resource "google_cloud_run_v2_service_iam_member" "eventarc_sa_invoker" {
  project  = google_cloudfunctions2_function.thumbnail_generator.project
  location = google_cloudfunctions2_function.thumbnail_generator.location
  name     = google_cloudfunctions2_function.thumbnail_generator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-eventarc.iam.gserviceaccount.com"
}

# Grant Pub/Sub service account permission to invoke the function (required for GCS events)
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker" {
  project  = google_cloudfunctions2_function.thumbnail_generator.project
  location = google_cloudfunctions2_function.thumbnail_generator.location
  name     = google_cloudfunctions2_function.thumbnail_generator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Grant the GCS service account permission to invoke (for storage events)
resource "google_cloud_run_v2_service_iam_member" "gcs_invoker" {
  project  = google_cloudfunctions2_function.thumbnail_generator.project
  location = google_cloudfunctions2_function.thumbnail_generator.location
  name     = google_cloudfunctions2_function.thumbnail_generator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:service-${data.google_project.current.number}@gs-project-accounts.iam.gserviceaccount.com"
}

# Grant the compute service account permission to invoke (used by Eventarc trigger)
resource "google_cloud_run_v2_service_iam_member" "compute_invoker" {
  project  = google_cloudfunctions2_function.thumbnail_generator.project
  location = google_cloudfunctions2_function.thumbnail_generator.location
  name     = google_cloudfunctions2_function.thumbnail_generator.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
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

# Grant Cloud Run service account permissions to sign URLs
resource "google_project_iam_member" "cloud_run_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# serv
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
        name  = "OPENAI_API_KEY"
        value = var.openai_api_key
      }

      env {
        name  = "ANTHROPIC_API_KEY"
        value = var.anthropic_api_key
      }

      env {
        name  = "GOOGLE_GENERATIVE_AI_API_KEY"
        value = var.google_generative_ai_api_key
      }

      env {
        name  = "ENCRYPTION_SECRET"
        value = var.encryption_secret
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
        name  = "AGENT_SERVICE_URL"
        value = google_cloud_run_v2_service.emubench_agent.uri
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

# Agent service
resource "google_cloud_run_v2_service" "emubench_agent" {
  name                 = "emubench-agent"
  location             = "us-central1"
  invoker_iam_disabled = true

  template {
    containers {
      image = "gcr.io/${var.project_id}/emubench-agent:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "TEST_PATH"
        value = "/tmp/placeholder"
      }

      env {
        name  = "AUTH_TOKEN"
        value = "placeholder-auth-token"
      }

      env {
        name  = "GOOGLE_TOKEN"
        value = "placeholder-google-token"
      }

      env {
        name  = "GAME_URL"
        value = "placeholder-game-url"
      }

      env {
        name  = "OPENAI_API_KEY"
        value = var.openai_api_key
      }

      env {
        name  = "ANTHROPIC_API_KEY"
        value = var.anthropic_api_key
      }

      env {
        name  = "GOOGLE_GENERATIVE_AI_API_KEY"
        value = var.google_generative_ai_api_key
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  depends_on = [google_service_account.cloud_run_sa]
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"
  
  disable_dependent_services = true
}

resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = "nam5"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

resource "google_project_iam_member" "app_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
  
  depends_on = [google_project_service.firestore]
}

resource "google_cloud_run_v2_service_iam_member" "serv_can_invoke_agent" {
  project  = var.project_id
  location = google_cloud_run_v2_service.emubench_agent.location
  name     = google_cloud_run_v2_service.emubench_agent.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "thumbnail_function_eventarc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.thumbnail_function_sa.email}"
}

# Grant the default compute service account permission to create triggers
resource "google_project_iam_member" "compute_eventarc_admin" {
  project = var.project_id
  role    = "roles/eventarc.admin"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}


resource "google_project_service" "eventarc" {
  service = "eventarc.googleapis.com"
}

# Create Eventarc trigger for Firestore document creation
resource "google_eventarc_trigger" "firestore_job_trigger" {
  name     = "firestore-job-trigger"
  location = "nam5"
  project  = var.project_id

  event_data_content_type = "application/protobuf"

  # Match Firestore document creation events
  matching_criteria {
    attribute = "type"
    value     = "google.cloud.firestore.document.v1.created"
  }

  matching_criteria {
    attribute = "database"
    value     = "(default)"
  }

  matching_criteria {
    attribute = "document"
    value     = "AGENT_JOBS/*"
    operator  = "match-path-pattern"
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.emubench_agent.name
      region  = google_cloud_run_v2_service.emubench_agent.location
    }
  }

  service_account = google_service_account.cloud_run_sa.email

  depends_on = [
    google_project_service.eventarc,
    google_cloud_run_v2_service.emubench_agent,
    google_project_iam_member.cloud_run_eventarc_receiver,
    google_project_iam_audit_config.firestore_audit
  ]
}

resource "google_project_iam_audit_config" "firestore_audit" {
  project = var.project_id
  service = "datastore.googleapis.com"
  
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  
  audit_log_config {
    log_type = "DATA_READ"
  }
  
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

data "google_project" "current" {}
