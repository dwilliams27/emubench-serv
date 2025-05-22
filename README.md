# 🛜 emubench-serv

Exposes tools using MCP for directly interacting with Gamecube games in the Dolphin emulator.

Use with [emubench-dolphin](https://github.com/dwilliams27/emubench-dolphin) and [emubench-ui](https://github.com/dwilliams27/emubench-ui)

## Deployment with Docker

This server can be deployed as a Docker container, particularly on Google Cloud Run.

### Local Docker Development

```bash
# Build the Docker image
docker build -t emubench-serv .

# Run the Docker container locally
docker run -p 3000:3000 emubench-serv
```

### Google Cloud Run Deployment

1. Make sure you have the Google Cloud SDK installed and initialized
2. Build and deploy using Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml
```

Alternatively, manually deploy with these commands:

```bash
# Build the container
docker build -t gcr.io/YOUR_PROJECT_ID/emubench-serv .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/emubench-serv

# Deploy to Cloud Run
gcloud run deploy emubench-serv \
  --image gcr.io/YOUR_PROJECT_ID/emubench-serv \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```
