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

# Database and Supabase configuration variables
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_service_role_key" {
  description = "Database service role key"
  type        = string
  sensitive   = true
}

variable "db_url" {
  description = "Database URL"
  type        = string
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "google_generative_ai_api_key" {
  description = "Google API key"
  type        = string
  sensitive   = true
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "emubench-459802"
}
