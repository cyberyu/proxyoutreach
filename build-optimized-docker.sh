#!/bin/bash

echo "🐳 Building optimized Docker image with updated MySQL data..."

# Clean up old SQL dumps first
echo "🧹 Cleaning up old SQL dumps..."
rm -f docker/proxy_backup.sql docker/proxy_backup_fresh.sql

# Create a fresh SQL dump of just the proxy database (smaller than --all-databases)
echo "📋 Creating fresh SQL dump from proxy database..."
mysqldump -u root -p proxy --routines --triggers --single-transaction > docker/proxy_backup_new.sql

if [ $? -eq 0 ]; then
    echo "✅ Fresh SQL dump created successfully"
    echo "📊 SQL dump size: $(du -sh docker/proxy_backup_new.sql | cut -f1)"
else
    echo "❌ Failed to create SQL dump"
    exit 1
fi

# Check if we should copy live MySQL data or use SQL dump approach
if sudo test -d "/var/lib/mysql/proxy"; then
    echo "🔄 Updating MySQL data copy with current database..."
    
    # Stop local development server to ensure clean data copy
    echo "⏸️  Stopping development server..."
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f nodemon 2>/dev/null || true
    
    # Copy fresh MySQL data
    ./copy-mysql-data.sh
    
    echo "📦 Building optimized image with fresh pre-loaded data..."
    docker build -t proxy-outreach:fresh-data .
    
    # Also tag as latest optimized
    docker tag proxy-outreach:fresh-data proxy-outreach:optimized
    
    # Restart development server
    echo "▶️  Restarting development server..."
    npm run dev &
    
else
    echo "📦 Building image with fresh SQL dump (no pre-loaded MySQL data)..."
    docker build -t proxy-outreach:optimized .
fi

# Show image sizes
echo ""
echo "📊 Image size comparison:"
docker images | grep proxy-outreach | head -5

# Calculate size difference
if docker images | grep -q "proxy-outreach.*optimized"; then
    NEW_SIZE=$(docker images | grep "proxy-outreach.*optimized" | head -1 | awk '{print $7}')
    OLD_SIZE=$(docker images | grep "proxy-outreach.*sql-dump" | head -1 | awk '{print $7}' 2>/dev/null || echo "N/A")
    echo ""
    echo "📈 Size comparison with sql-dump version:"
    echo "   Old (sql-dump): $OLD_SIZE"
    echo "   New (optimized): $NEW_SIZE"
fi

echo ""
echo "✅ Optimized image built successfully!"
echo "🚀 To run: docker run -d -p 3000:3000 proxy-outreach:optimized"
echo "🔧 Alternative: docker run -d -p 3000:3000 proxy-outreach:fresh-data"
echo ""
echo "💡 Image includes all current database updates and optimizations"
echo "🔄 Image follows the same pattern as sql-dump but with improvements"
