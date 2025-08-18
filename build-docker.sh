#!/bin/bash

# Docker build script for proxy account outreach application

echo "Building Proxy Account Outreach Docker Image..."

# Check if pre-loaded data exists
if [ -d "docker/mysql-data" ]; then
    echo "🚀 Pre-loaded database detected - building optimized image..."
    echo "📊 Database size: $(du -sh docker/mysql-data/ | cut -f1)"
    
    # Build with pre-loaded data
    docker build -t proxy-outreach:preloaded .
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Docker image built successfully with pre-loaded database!"
        echo ""
        echo "🏃‍♂️ Ultra-fast startup - no data import needed!"
        echo ""
        echo "To run the container:"
        echo "docker run -d -p 3000:3000 --name proxy-outreach-app proxy-outreach:preloaded"
        echo ""
        echo "Access the application at: http://localhost:3000"
        echo ""
        echo "📖 See DOCKER-PRELOADED.md for detailed documentation"
    else
        echo "❌ Build failed!"
        exit 1
    fi
else
    echo "⚠️  No pre-loaded database found - building with empty database..."
    echo ""
    echo "To create pre-loaded database:"
    echo "1. Run: ./copy-mysql-data.sh"
    echo "2. Run: ./build-docker.sh"
    echo ""
    
    # Build without pre-loaded data (original version)
    docker build -t proxy-outreach:latest .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker image built successfully!"
        echo ""
        echo "To run the container:"
        echo "docker run -d -p 3000:3000 --name proxy-outreach-app proxy-outreach:latest"
        echo ""
        echo "Or use docker-compose:"
        echo "docker-compose up -d"
        echo ""
        echo "Access the application at: http://localhost:3000"
    else
        echo "❌ Build failed!"
        exit 1
    fi
fi
