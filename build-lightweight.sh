#!/bin/bash

# Build script for lightweight proxy outreach Docker image
# SQL dumps are mounted as external volumes

set -e

echo "🚀 Building Lightweight Proxy Outreach Docker Image..."
echo "📊 Supports all five proxy databases:"
echo "   - proxy (main application data)"
echo "   - proxy_sds (SDS-specific data)"
echo "   - proxy_sds_calibrated (SDS calibrated data)"
echo "   - proxy_sel (SEL-specific data)"  
echo "   - proxy_sel_calibrated (SEL calibrated data)"

# Configuration
IMAGE_NAME="proxy-outreach-lightweight"
TAG="latest"
DOCKERFILE="Dockerfile.lightweight"

echo "🔨 Building Docker image: $IMAGE_NAME:$TAG"
echo "📋 Using Dockerfile: $DOCKERFILE"
echo "⏰ Build started at: $(date)"

# Build the lightweight Docker image (without SQL dumps)
docker build \
    -f "$DOCKERFILE" \
    -t "$IMAGE_NAME:$TAG" \
    --compress=false \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Docker build completed successfully!"
    echo "⏰ Build completed at: $(date)"
    echo ""
    echo "📦 Image details:"
    docker images "$IMAGE_NAME:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo "🚀 To run the container with EFS-mounted SQL dumps:"
    echo "   # First ensure you have the SQL dumps available for all databases"
    echo "   mkdir -p ./dumps"
    echo "   cp docker/proxy_complete_dump.sql ./dumps/ # Main proxy database"
    echo "   # Add other database dumps as needed:"
    echo "   # cp docker/proxy_sds_dump.sql ./dumps/"
    echo "   # cp docker/proxy_sds_calibrated_dump.sql ./dumps/"
    echo "   # cp docker/proxy_sel_dump.sql ./dumps/"
    echo "   # cp docker/proxy_sel_calibrated_dump.sql ./dumps/"
    echo ""
    echo "   # Run container with volume mount"
    echo "   docker run -d -p 3000:3000 -p 3306:3306 \\"
    echo "     -v \$(pwd)/dumps:/usr/src/app/data/dumps \\"
    echo "     --name proxy-outreach-lightweight \\"
    echo "     $IMAGE_NAME:$TAG"
    echo ""
    echo "🚀 Production ECS deployment (with EFS):"
    echo "   # All database SQL dumps will be automatically mounted from EFS"
    echo "   # Container supports all five proxy databases"
    echo "   # No manual volume mounting needed"
    echo ""
    echo "🚀 Alternative: Run with empty databases (for testing):"
    echo "   # Creates all five databases but without data"
    echo "   docker run -d -p 3000:3000 -p 3306:3306 --name proxy-outreach-lightweight $IMAGE_NAME:$TAG"
    echo ""
    echo "🔍 To check container logs:"
    echo "   docker logs -f proxy-outreach-lightweight"
    echo ""
    echo "🌐 Access the application at:"
    echo "   http://localhost:3000"
    echo ""
    echo "💡 Benefits of lightweight approach:"
    echo "   - Much smaller Docker image size"
    echo "   - Faster builds and transfers"
    echo "   - SQL dumps can be updated without rebuilding image"
    echo "   - Easy to run with different datasets"
    echo "   - Supports all five proxy databases with flexible data loading"
else
    echo "❌ Docker build failed!"
    exit 1
fi
