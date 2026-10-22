#!/bin/bash
set -e

# Build and Push Script for CRM Frontend
# This script ensures fresh CSS generation on every build

echo "🏗️  Building CRM Frontend Docker Image..."

# Get build metadata
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
REGISTRY="127.0.0.1:5000"
IMAGE_NAME="crm-frontend"
TAG="latest"

echo "📅 Build Date: $BUILD_DATE"
echo "📝 Git Commit: $GIT_COMMIT"
echo "🏷️  Image: $REGISTRY/$IMAGE_NAME:$TAG"

# Build with arguments to bust cache
docker build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg GIT_COMMIT="$GIT_COMMIT" \
  -f deploy/Dockerfile \
  -t $REGISTRY/$IMAGE_NAME:$TAG \
  .

echo "✅ Build complete!"

# Verify build
echo "🔍 Verifying build..."
docker run --rm $REGISTRY/$IMAGE_NAME:$TAG cat /etc/nginx/build-info.txt

# Push to registry
echo "📤 Pushing to registry..."
docker push $REGISTRY/$IMAGE_NAME:$TAG

echo "✨ Done! Image pushed to registry."
echo "👉 Now run deployment on server: cd /opt/apps/prod/app-frontend && docker compose pull && docker compose up -d"
