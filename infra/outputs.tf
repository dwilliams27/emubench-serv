output "cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "GKE Cluster Endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_location" {
  description = "GKE Cluster Location"
  value       = google_container_cluster.primary.location
}

output "node_pool_zones" {
  description = "Zones where node pool instances can be created"
  value       = var.zones
}

output "get_credentials_command" {
  description = "Command to get cluster credentials"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --zone ${google_container_cluster.primary.location} --project emubench-459802"
}

output "node_pool_service_account_email" {
  description = "Email of the node pool service account"
  value       = google_service_account.gke_node_pool_sa.email
}

output "workload_service_account_email" {
  description = "Email of the workload service account"
  value       = google_service_account.emubench_workload_sa.email
}

output "node_pool_name" {
  description = "Name of the spot node pool (handles all workloads)"
  value       = google_container_node_pool.arm_spot_nodes.name
}

output "node_pool_taints" {
  description = "Taints applied to nodes - use these in tolerations"
  value = [
    "architecture=arm64:NoSchedule",
    "kubernetes.io/arch=arm64:NoSchedule"
  ]
}

output "workload_deployment_notes" {
  description = "Important notes for deploying workloads"
  value = <<-EOT
    All workloads run on spot instances. Your pods need:
    1. Toleration for architecture=arm64:NoSchedule
    2. Toleration for kubernetes.io/arch=arm64:NoSchedule  
    3. ARM64-compatible container images
    4. Graceful handling of spot instance preemption (30s warning)
    5. Consider using Deployments with multiple replicas for high availability
  EOT
}

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

output "cluster_ca_certificate" {
  description = "GKE Cluster CA Certificate (base64 encoded)"
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

output "cloud_run_service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_service.emubench_serv.status[0].url
}

output "private_cluster_endpoint" {
  description = "Private IP address of the cluster endpoint"
  value       = google_container_cluster.primary.private_cluster_config[0].private_endpoint
  sensitive   = true
}

output "master_ipv4_cidr_block" {
  description = "The IP range in CIDR notation used for the hosted master network"
  value       = google_container_cluster.primary.private_cluster_config[0].master_ipv4_cidr_block
}
