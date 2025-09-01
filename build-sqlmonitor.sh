#!/bin/bash

# Build script for SQL monitoring proxy outreach Docker image
# Enhanced with MySQL health monitoring and auto-restart capabilities

set -e

echo "🚀 Building SQL Monitoring Proxy Outreach Docker Image..."
echo "🏥 Enhanced with MySQL health monitoring features:"
echo "   - Automatic health checks every 5 minutes"
echo "   - Automatic restart on MySQL failure detection"  
echo "   - Preventive restarts every 4 hours"
echo "   - Connection pooling with automatic reconnection"
echo "   - Web-based MySQL admin interface"
echo "📊 Supports all five proxy databases:"
echo "   - proxy (main application data)"
echo "   - proxy_sds (SDS-specific data)"
echo "   - proxy_sds_calibrated (SDS calibrated data)"
echo "   - proxy_sel (SEL-specific data)"  
echo "   - proxy_sel_calibrated (SEL calibrated data)"

# Configuration
IMAGE_NAME="proxy-outreach-sqlmonitor"
TAG="latest"
DOCKERFILE="Dockerfile.sqlmonitor"

echo "🔨 Building Docker image: $IMAGE_NAME:$TAG"
echo "📋 Using Dockerfile: $DOCKERFILE"
echo "⏰ Build started at: $(date)"

# Build the SQL monitoring Docker image
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
    echo "🏥 SQL Monitoring Features Included:"
    echo "   ✅ MySQL health monitoring every 5 minutes"
    echo "   ✅ Automatic restart on failure detection"
    echo "   ✅ Preventive restarts every 4 hours"
    echo "   ✅ Connection pooling with automatic reconnection"
    echo "   ✅ Web-based MySQL admin interface at /mysql_admin.html"
    echo "   ✅ MySQL management API endpoints (/api/mysql/*)"
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
    echo "   # Run container with volume mount and enhanced monitoring"
    echo "   docker run -d -p 3000:3000 -p 3306:3306 \\"
    echo "     -v \$(pwd)/dumps:/usr/src/app/data/dumps \\"
    echo "     --name proxy-outreach-sqlmonitor \\"
    echo "     $IMAGE_NAME:$TAG"
    echo ""
    echo "🚀 Production ECS deployment (with EFS):"
    echo "   # All database SQL dumps will be automatically mounted from EFS"
    echo "   # Enhanced MySQL monitoring prevents server death after several runs"
    echo "   # Container supports all five proxy databases with health monitoring"
    echo "   # No manual volume mounting needed"
    echo ""
    echo "🚀 Alternative: Run with empty databases (for testing):"
    echo "   # Creates all five databases but without data (with monitoring)"
    echo "   docker run -d -p 3000:3000 -p 3306:3306 --name proxy-outreach-sqlmonitor $IMAGE_NAME:$TAG"
    echo ""
    echo "🔍 To check container logs:"
    echo "   docker logs -f proxy-outreach-sqlmonitor"
    echo ""
    echo "🌐 Access the application at:"
    echo "   Main App:     http://localhost:3000"
    echo "   MySQL Admin: http://localhost:3000/mysql_admin.html"
    echo ""
    echo "🔧 MySQL Management API endpoints:"
    echo "   Health Check: http://localhost:3000/api/mysql/health"
    echo "   Restart:      http://localhost:3000/api/mysql/restart"
    echo "   Status:       http://localhost:3000/api/mysql/status"
    echo ""
    echo "💡 Benefits of SQL monitoring approach:"
    echo "   - Prevents MySQL server death after several runs"
    echo "   - Automatic health monitoring and recovery"
    echo "   - Connection pooling prevents connection exhaustion"
    echo "   - Preventive maintenance reduces memory leaks"
    echo "   - Web interface for MySQL management and monitoring"
    echo "   - Much smaller Docker image size (SQL dumps external)"
    echo "   - Faster builds and transfers"
    echo "   - SQL dumps can be updated without rebuilding image"
    echo "   - Easy to run with different datasets"
    echo "   - Supports all five proxy databases with flexible data loading"
else
    echo "❌ Docker build failed!"
    exit 1
fi
