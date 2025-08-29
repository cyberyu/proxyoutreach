#!/bin/bash
# build-production.sh
# Build lightweight production Docker image (no SQL dumps included)

set -e

echo "🚀 Building lightweight production Docker image..."

# Check if required files exist
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

if [ ! -d "public" ]; then
    echo "❌ Error: public directory not found"
    exit 1
fi

echo "📋 Building production image with:"
echo "  ✅ Application code (server.js)"
echo "  ✅ Package dependencies (package.json)"
echo "  ✅ Static files (public/)"
echo "  ❌ No SQL dumps (will use EFS)"

# Build the production image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.production -t proxy-outreach:production .

if [ $? -eq 0 ]; then
    # Get image size
    IMAGE_SIZE=$(docker images proxy-outreach:production --format "{{.Size}}")
    echo ""
    echo "✅ Production image built successfully!"
    echo "📦 Image size: $IMAGE_SIZE"
    echo "🏷️  Image tag: proxy-outreach:production"
    echo ""
    echo "📊 Size comparison:"
    echo "  Old image: 41GB (with all SQL dumps)"
    echo "  New image: $IMAGE_SIZE (application only)"
    echo ""
    echo "🚀 Ready for ECS deployment with EFS mounts!"
    echo ""
    echo "🧪 Test locally:"
    echo "   docker run -d --name proxy-prod-test -p 3000:3000 \\"
    echo "     -e SQL_DUMP_PATH=/mnt/efs/dumps/proxy_complete_dump.sql \\"
    echo "     proxy-outreach:production"
    echo ""
    echo "🏗️  Next steps:"
    echo "   1. Push to ECR: docker tag proxy-outreach:production YOUR_ECR_REPO:latest"
    echo "   2. Use ecs-task-definition-efs.json for ECS deployment"
    echo "   3. EFS will provide the SQL dumps at runtime"
else
    echo "❌ Failed to build production image"
    exit 1
fi
