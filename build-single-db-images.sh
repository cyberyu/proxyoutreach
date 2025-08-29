#!/bin/bash
# build-single-db-images.sh
# Build lightweight Docker images for individual database testing

set -e

echo "🔨 Building lightweight database-specific Docker images..."

# Function to build single database image
build_single_db_image() {
    local db_name="$1"
    local dump_file="docker/${db_name}_complete_dump.sql"
    
    if [ ! -f "$dump_file" ]; then
        echo "❌ Error: $dump_file not found"
        return 1
    fi
    
    echo "📦 Building image for $db_name database..."
    
    # Create temporary Dockerfile
    cat > Dockerfile.${db_name}-test << EOF
# Lightweight MySQL image for ${db_name} database testing
FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=rootpass
ENV MYSQL_DATABASE=${db_name}
ENV MYSQL_USER=webapp
ENV MYSQL_PASSWORD=webapppass

# Copy only the specific database dump
COPY ${dump_file} /docker-entrypoint-initdb.d/

EXPOSE 3306
EOF

    # Build the image
    docker build -f Dockerfile.${db_name}-test -t proxy-outreach:${db_name}-test .
    
    # Clean up
    rm Dockerfile.${db_name}-test
    
    echo "✅ Built proxy-outreach:${db_name}-test ($(docker images proxy-outreach:${db_name}-test --format "{{.Size}}")"
}

# Available databases
DATABASES=("proxy" "proxy_sds" "proxy_sds_calibrated" "proxy_sel" "proxy_sel_calibrated")

echo "📋 Available databases:"
for db in "${DATABASES[@]}"; do
    if [ -f "docker/${db}_complete_dump.sql" ]; then
        size=$(du -h "docker/${db}_complete_dump.sql" | cut -f1)
        echo "  ✅ $db ($size)"
    else
        echo "  ❌ $db (dump not found)"
    fi
done

echo ""
echo "Which database would you like to build an image for?"
echo "Options: ${DATABASES[*]}"
read -p "Enter database name (or 'all' for all): " choice

if [ "$choice" = "all" ]; then
    echo "🚀 Building images for all databases..."
    for db in "${DATABASES[@]}"; do
        build_single_db_image "$db"
    done
else
    if [[ " ${DATABASES[@]} " =~ " ${choice} " ]]; then
        build_single_db_image "$choice"
    else
        echo "❌ Invalid choice: $choice"
        exit 1
    fi
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "📋 Usage examples:"
echo "   # Test proxy database:"
echo "   docker run -d --name proxy-test -p 3307:3306 proxy-outreach:proxy-test"
echo ""
echo "   # Test proxy_sds database:"
echo "   docker run -d --name proxy-sds-test -p 3308:3306 proxy-outreach:proxy_sds-test"
echo ""
echo "🧹 Clean up when done:"
echo "   docker stop proxy-test && docker rm proxy-test"
