output "cloud_run_service_account_email" {
  description = "Email of the Cloud Run service account"
  value       = google_service_account.cloud_run_sa.email
}

output "cloud_build_service_account_email" {
  description = "Email of the Cloud Build service account"
  value       = google_service_account.cloud_build_sa.email
}

output "storage_bucket_name" {
  description = "Name of the Google Cloud Storage bucket for sessions"
  value       = google_storage_bucket.emubench_sessions.name
}

output "storage_bucket_url" {
  description = "URL of the Google Cloud Storage bucket for sessions"
  value       = google_storage_bucket.emubench_sessions.url
}

output "cloud_run_service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.emubench_serv.uri
}
