# Deployments

gcloud auth application-default login

terraform init
terraform plan
terraform apply

## emubench-serv deploy
gcloud builds submit --config cloudbuild.yaml .
