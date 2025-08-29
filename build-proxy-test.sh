#!/bin/bash
# build-proxy-test.sh
# Quick build script for testing proxy database only

echo "🔨 Building proxy-test Docker image with proxy_complete_dump.sql..."

# Check if the proxy dump exists
if [ ! -f "docker/proxy_complete_dump.sql" ]; then
    echo "❌ Error: docker/proxy_complete_dump.sql not found"
    echo "💡 Run ./generate_optimized_dumps.sh first to create the dump"
    exit 1
fi

echo "📋 Proxy dump info:"
ls -lh docker/proxy_complete_dump.sql

# Build the test image
docker build -f Dockerfile.proxy-test -t proxy-outreach:proxy-test .

if [ $? -eq 0 ]; then
    echo "✅ Proxy test image built successfully!"
    echo ""
    echo "🚀 To test locally:"
    echo "   docker run -d --name proxy-test -p 3307:3306 proxy-outreach:proxy-test"
    echo "   # Wait for MySQL to start (30-60 seconds)"
    echo "   mysql -h localhost -P 3307 -u webapp -pwebapppass proxy -e 'SELECT COUNT(*) FROM account_unvoted;'"
    echo ""
    echo "🧹 To clean up:"
    echo "   docker stop proxy-test && docker rm proxy-test"
else
    echo "❌ Failed to build proxy test image"
    exit 1
fi
