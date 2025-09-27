#!/bin/bash

# Stop and remove existing container
docker stop training-server 2>/dev/null
docker rm training-server 2>/dev/null

# Create db directory if not exists
mkdir -p ./db/training

# Run container
docker run -d \
  --name training-server \
  -p 2445:2445 \
  -e NODE_ENV=production \
  -e PORT=2445 \
  -v ./db/training:/app/db \
  -v ./.env_training:/app/.env:ro \
  --restart unless-stopped \
  srv-training-server:latest

echo "Container started. Access: http://localhost:2445"
