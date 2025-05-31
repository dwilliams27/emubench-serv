variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zones" {
  description = "GCP Zones where ARM instances are available"
  type        = list(string)
  default     = ["us-central1-a", "us-central1-b"]
}

variable "cluster_name" {
  description = "GKE Cluster name"
  type        = string
  default     = "emubench-arm-cluster"
}

variable "authorized_emails" {
  description = "List of email addresses authorized to access the Cloud Run service"
  type        = list(string)
  default     = []
}
