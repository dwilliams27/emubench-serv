# Deployments

gcloud auth application-default login

curl -s ifconfig.me
gcloud container clusters update emubench-arm-cluster --zone=us-central1-a --enable-master-authorized-networks --master-authorized-networks 10.3.0.0/28,X.X.X.X/32

terraform init
terraform plan
terraform apply

gcloud builds submit --config cloudbuild.yaml .

## Start fresh
kubectl delete pods --all -n emubench-containers

## Events
kubectl get events -n emubench-containers --sort-by=.metadata.creationTimestamp

## Reset kubectl creds
gcloud container clusters get-credentials emubench-arm-cluster --zone=us-central1-a
