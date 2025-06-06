# Deployments

gcloud auth application-default login

curl -s ifconfig.me
gcloud container clusters update emubench-arm-cluster --zone=us-central1-a --enable-master-authorized-networks --master-authorized-networks 10.3.0.0/28,207.144.110.226/32

terraform init
terraform plan
terraform apply

gcloud builds submit --config cloudbuild.yaml .
