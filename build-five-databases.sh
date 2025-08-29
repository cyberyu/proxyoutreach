#!/bin/bash

# Build script for complete proxy outreach Docker image with all five databases
# Builds from the reference-compatible base and includes all database dumps

set -e

echo "🚀 Building Complete Proxy Outreach Docker Image with Five Databases..."

# Configuration
IMAGE_NAME="proxy-outreach-complete"
TAG="five-databases"
DOCKERFILE="Dockerfile.complete"

# Check if required dump files exist - ALL FIVE DATABASES
echo "🔍 Checking for required SQL dump files (all five databases)..."
REQUIRED_DUMPS=(
    "docker/proxy_complete_dump.sql"
    "docker/proxy_sds_complete_dump.sql"
    "docker/proxy_sds_calibrated_complete_dump.sql"
    "docker/proxy_sel_complete_dump.sql"
    "docker/proxy_sel_calibrated_complete_dump.sql"
)

MISSING_FILES=()
for dump_file in "${REQUIRED_DUMPS[@]}"; do
    if [ ! -f "$dump_file" ]; then
        MISSING_FILES+=("$dump_file")
    else
        echo "✅ Found: $dump_file ($(du -h "$dump_file" | cut -f1))"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Missing required dump files:"
    for missing in "${MISSING_FILES[@]}"; do
        echo "   - $missing"
    done
    echo ""
    echo "💡 Run the following command to generate all dumps:"
    echo "   bash generate_optimized_dumps.sh"
    exit 1
fi

echo ""
echo "✅ All required dump files found!"

# Build the Docker image
echo "🔨 Building Docker image: $IMAGE_NAME:$TAG"
echo "📋 Using Dockerfile: $DOCKERFILE"
echo "⏰ Build started at: $(date)"

# Calculate total size of dumps
TOTAL_SIZE=0
for dump_file in "${REQUIRED_DUMPS[@]}"; do
    SIZE=$(du -m "$dump_file" | cut -f1)
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
done

echo "📊 Total dump size: ${TOTAL_SIZE}MB"
echo ""

# Build with build context optimization and compression disabled
docker build \
    -f "$DOCKERFILE" \
    -t "$IMAGE_NAME:$TAG" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
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
    echo "🚀 To run the container:"
    echo "   docker run -d -p 3000:3000 --name proxy-outreach-five-db $IMAGE_NAME:$TAG"
    echo ""
    echo "🔍 To check container logs:"
    echo "   docker logs -f proxy-outreach-five-db"
    echo ""
    echo "🌐 Access the application at:"
    echo "   http://localhost:3000"
    echo ""
    echo "📋 Container includes ALL FIVE DATABASES:"
    echo "   - proxy"
    echo "   - proxy_sds"
    echo "   - proxy_sds_calibrated"
    echo "   - proxy_sel"
    echo "   - proxy_sel_calibrated"
    echo ""
    echo "💡 All databases are now enabled and ready for use!"
else
    echo "❌ Docker build failed!"
    exit 1
fi
