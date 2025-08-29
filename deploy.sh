#!/bin/bash

# Complete deployment script for proxy outreach application
# Handles both Docker image and SQL dumps distribution

set -e

echo "🚀 Proxy Outreach - Complete Deployment Script"
echo "=============================================="

# Configuration
DOCKER_IMAGE="proxy-outreach-lightweight:latest"
DUMPS_ARCHIVE="proxy-outreach-dumps.tar.gz"
CONTAINER_NAME="proxy-outreach-app"

# Function to create dumps archive
create_dumps_archive() {
    echo "📦 Creating SQL dumps archive..."
    
    if [ ! -d "docker" ]; then
        echo "❌ docker directory not found!"
        exit 1
    fi
    
    # Create compressed archive of SQL dumps
    tar -czf "$DUMPS_ARCHIVE" \
        docker/proxy_complete_dump.sql \
        docker/proxy_sds_complete_dump.sql \
        docker/proxy_sds_calibrated_complete_dump.sql \
        docker/proxy_sel_complete_dump.sql \
        docker/proxy_sel_calibrated_complete_dump.sql
    
    echo "✅ Created dumps archive: $DUMPS_ARCHIVE"
    echo "   Size: $(du -h "$DUMPS_ARCHIVE" | cut -f1)"
}

# Function to extract dumps
extract_dumps() {
    echo "📂 Extracting SQL dumps..."
    
    if [ ! -f "$DUMPS_ARCHIVE" ]; then
        echo "❌ Dumps archive not found: $DUMPS_ARCHIVE"
        echo "💡 Run with --create-archive to create it"
        exit 1
    fi
    
    # Create local dumps directory
    mkdir -p ./dumps
    
    # Extract dumps to local directory
    tar -xzf "$DUMPS_ARCHIVE" -C ./dumps --strip-components=1
    
    echo "✅ Extracted dumps to ./dumps/"
    ls -lh ./dumps/
}

# Function to deploy complete application
deploy_app() {
    echo "🚀 Deploying complete application..."
    
    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "🛑 Stopping existing container..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
    
    # Check if dumps directory exists
    if [ ! -d "./dumps" ]; then
        echo "📂 Dumps directory not found, extracting..."
        extract_dumps
    fi
    
    # Run the container with mounted dumps
    echo "🐳 Starting Docker container..."
    docker run -d \
        -p 3000:3000 \
        -v "$(pwd)/dumps:/usr/src/app/data/dumps" \
        --name "$CONTAINER_NAME" \
        "$DOCKER_IMAGE"
    
    echo "✅ Container started successfully!"
    echo "🌐 Application available at: http://localhost:3000"
    echo "🔍 Check logs: docker logs -f $CONTAINER_NAME"
}

# Function to show deployment status
show_status() {
    echo "📊 Deployment Status"
    echo "==================="
    
    # Docker image status
    if docker images "$DOCKER_IMAGE" --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' | grep -q "proxy-outreach-lightweight"; then
        echo "✅ Docker image: $DOCKER_IMAGE"
        docker images "$DOCKER_IMAGE" --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'
    else
        echo "❌ Docker image not found: $DOCKER_IMAGE"
    fi
    
    echo ""
    
    # Dumps archive status
    if [ -f "$DUMPS_ARCHIVE" ]; then
        echo "✅ Dumps archive: $DUMPS_ARCHIVE ($(du -h "$DUMPS_ARCHIVE" | cut -f1))"
    else
        echo "❌ Dumps archive not found: $DUMPS_ARCHIVE"
    fi
    
    echo ""
    
    # Local dumps status
    if [ -d "./dumps" ]; then
        echo "✅ Local dumps directory:"
        ls -lh ./dumps/ | head -6
    else
        echo "❌ Local dumps directory not found"
    fi
    
    echo ""
    
    # Container status
    if docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -q "$CONTAINER_NAME"; then
        echo "✅ Container running:"
        docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep "$CONTAINER_NAME"
    else
        echo "❌ Container not running: $CONTAINER_NAME"
    fi
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up deployment..."
    
    # Stop and remove container
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    # Remove local dumps
    rm -rf ./dumps
    
    # Optionally remove dumps archive
    read -p "Remove dumps archive ($DUMPS_ARCHIVE)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$DUMPS_ARCHIVE"
        echo "✅ Removed dumps archive"
    fi
    
    echo "✅ Cleanup completed"
}

# Main script logic
case "${1:-}" in
    --create-archive)
        create_dumps_archive
        ;;
    --extract-dumps)
        extract_dumps
        ;;
    --deploy)
        deploy_app
        ;;
    --status)
        show_status
        ;;
    --cleanup)
        cleanup
        ;;
    --full-deploy)
        echo "🚀 Full deployment process..."
        create_dumps_archive
        extract_dumps
        deploy_app
        show_status
        ;;
    --help|*)
        echo "Proxy Outreach Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  --create-archive   Create compressed archive of SQL dumps"
        echo "  --extract-dumps    Extract SQL dumps from archive"
        echo "  --deploy          Deploy application with Docker"
        echo "  --full-deploy     Complete deployment (archive + extract + deploy)"
        echo "  --status          Show deployment status"
        echo "  --cleanup         Clean up containers and files"
        echo "  --help            Show this help message"
        echo ""
        echo "Deployment Process:"
        echo "1. Build lightweight Docker image:    ./build-lightweight.sh"
        echo "2. Create and deploy complete app:    $0 --full-deploy"
        echo "3. Check status:                      $0 --status"
        echo ""
        echo "Distribution:"
        echo "- Ship Docker image:                  docker save/load or registry"
        echo "- Ship SQL dumps:                     $DUMPS_ARCHIVE file"
        ;;
esac
