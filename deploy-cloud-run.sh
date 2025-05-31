#!/bin/bash

# Deploy Cloud Run service with GKE cluster access
# This script sets up the necessary infrastructure and deploys the service

set -e  # Exit on any error

PROJECT_ID="emubench-459802"
CLUSTER_NAME="emubench-arm-cluster"
CLUSTER_LOCATION="us-central1-a"

echo "🚀 Deploying emubench-serv to Cloud Run with GKE access..."

# Step 0: Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com

# Step 1: Apply Terraform infrastructure
echo "📦 Applying Terraform infrastructure..."
cd infra
terraform init
terraform plan
terraform apply -auto-approve
cd ..

# Step 2: Ensure the Cloud Run service account has proper permissions
echo "🔑 Verifying service account permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:emubench-cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.clusterAdmin" || true

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:emubench-cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer" || true

# Step 3: Build and deploy via Cloud Build
echo "🏗️  Building and deploying service..."
gcloud builds submit --config cloudbuild.yaml .

# Step 4: Get the deployed service URL
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe emubench-serv --region=us-central1 --format="value(status.url)")
echo "🌐 Service URL: $SERVICE_URL"

echo ""
echo "📋 Next steps:"
echo "1. Test the service: curl $SERVICE_URL/health"
echo "2. Monitor logs: gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=emubench-serv' --limit 50"
echo "3. Check GKE connectivity by creating a test container through your API"
