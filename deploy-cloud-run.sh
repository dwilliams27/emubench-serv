#!/bin/bash

echo "📦 Applying Terraform infrastructure..."
cd infra
terraform init
terraform plan
terraform apply -auto-approve
cd ..

echo "🏗️  Building and deploying service..."
gcloud builds submit --config cloudbuild.yaml .

echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe emubench-serv --region=us-central1 --format="value(status.url)")
echo "🌐 Service URL: $SERVICE_URL"
