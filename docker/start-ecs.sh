#!/bin/bash

# ECS-optimized startup script for proxy outreach container
# Downloads SQL dumps from S3 and imports them at runtime

set -e

echo "🚀 Starting Proxy Outreach Container on AWS ECS..."
echo "⏰ Container started at: $(date)"

# Start MySQL service
echo "🔧 Starting MySQL service..."
service mysql start

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
until mysqladmin ping >/dev/null 2>&1; do
    echo "   MySQL is unavailable - sleeping"
    sleep 2
done
echo "✅ MySQL is ready!"

# Create databases and user
echo "🔧 Setting up MySQL databases and user..."
mysql -u root <<EOF
-- Create webapp user
CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapp_password_2024';
CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapp_password_2024';

-- Create all five databases
CREATE DATABASE IF NOT EXISTS proxy;
CREATE DATABASE IF NOT EXISTS proxy_sds;
CREATE DATABASE IF NOT EXISTS proxy_sds_calibrated;
CREATE DATABASE IF NOT EXISTS proxy_sel;
CREATE DATABASE IF NOT EXISTS proxy_sel_calibrated;

-- Grant privileges
GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';
GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'%';
GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'%';
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'%';
GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'localhost';

FLUSH PRIVILEGES;
EOF

echo "✅ MySQL setup completed!"

# Function to download dumps from S3
download_dumps_from_s3() {
    local bucket="$S3_BUCKET"
    local prefix="${S3_DUMPS_PREFIX:-proxy-outreach/dumps/}"
    local dump_dir="/usr/src/app/data/dumps"
    
    echo "📥 Downloading SQL dumps from S3..."
    echo "   Bucket: $bucket"
    echo "   Prefix: $prefix"
    
    mkdir -p "$dump_dir"
    
    # Check if we have archive or individual files
    if aws s3 ls "s3://$bucket/${prefix}proxy-outreach-dumps.tar.gz" >/dev/null 2>&1; then
        echo "📦 Downloading compressed archive..."
        aws s3 cp "s3://$bucket/${prefix}proxy-outreach-dumps.tar.gz" /tmp/dumps.tar.gz
        
        echo "📂 Extracting archive..."
        tar -xzf /tmp/dumps.tar.gz -C "$dump_dir" --strip-components=1
        rm /tmp/dumps.tar.gz
        
    else
        echo "📁 Downloading individual SQL files..."
        aws s3 sync "s3://$bucket/$prefix" "$dump_dir" --include "*.sql"
    fi
    
    echo "✅ Downloads completed!"
    ls -lh "$dump_dir"
}

# Function to import dumps (same as before but with S3 download)
import_sql_dumps() {
    local dump_dir="/usr/src/app/data/dumps"
    
    # Download from S3 if bucket is specified
    if [ -n "$S3_BUCKET" ]; then
        download_dumps_from_s3
    fi
    
    # Define dump files and their target databases
    local dumps=(
        "proxy_complete_dump.sql:proxy"
        "proxy_sds_complete_dump.sql:proxy_sds"
        "proxy_sds_calibrated_complete_dump.sql:proxy_sds_calibrated"
        "proxy_sel_complete_dump.sql:proxy_sel"
        "proxy_sel_calibrated_complete_dump.sql:proxy_sel_calibrated"
    )
    
    echo "🔍 Checking for SQL dumps in $dump_dir..."
    
    for dump_info in "${dumps[@]}"; do
        IFS=':' read -r dump_file database <<< "$dump_info"
        dump_path="$dump_dir/$dump_file"
        
        if [ -f "$dump_path" ]; then
            echo "📥 Importing $dump_file into $database database..."
            echo "   File size: $(du -h "$dump_path" | cut -f1)"
            echo "   Started at: $(date)"
            
            # Import with progress indication
            mysql -u webapp -pwebapp_password_2024 "$database" < "$dump_path"
            
            if [ $? -eq 0 ]; then
                echo "   ✅ Successfully imported $dump_file"
                echo "   Completed at: $(date)"
            else
                echo "   ❌ Failed to import $dump_file"
            fi
        else
            echo "⚠️  SQL dump not found: $dump_path"
            echo "   Database $database will be empty"
        fi
        echo ""
    done
}

# Import SQL dumps
import_sql_dumps

# Database status summary
echo "🔍 Database status summary:"
databases=("proxy" "proxy_sds" "proxy_sds_calibrated" "proxy_sel" "proxy_sel_calibrated")
for database in "${databases[@]}"; do
    table_count=$(mysql -u webapp -pwebapp_password_2024 -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$database';" 2>/dev/null || echo "0")
    echo "   $database: $table_count tables"
done

echo ""
echo "🚀 Starting Node.js application..."
echo "🌐 Application will be available at: http://localhost:3000"
echo "📋 All five databases are configured:"
echo "   - proxy"
echo "   - proxy_sds" 
echo "   - proxy_sds_calibrated"
echo "   - proxy_sel"
echo "   - proxy_sel_calibrated"

# Add ECS metadata logging
if [ -n "$ECS_CONTAINER_METADATA_URI_V4" ]; then
    echo "🔍 ECS Task Metadata:"
    curl -s "$ECS_CONTAINER_METADATA_URI_V4/task" | jq '.Family, .Revision, .DesiredStatus' 2>/dev/null || echo "   Metadata URI available"
fi

echo ""

# Start the Node.js application
exec node server.js
