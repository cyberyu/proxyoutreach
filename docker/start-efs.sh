#!/bin/bash

# EFS-based startup script for proxy outreach container
# Uses EFS mounted volume for SQL dumps

set -e

echo "🚀 Starting Proxy Outreach Container with EFS..."
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

# Import SQL dumps from EFS mounted volume
import_sql_dumps() {
    local dump_dir="/usr/src/app/data/dumps"
    
    # Define dump files and their target databases
    local dumps=(
        "proxy_complete_dump.sql:proxy"
        "proxy_sds_complete_dump.sql:proxy_sds"
        "proxy_sds_calibrated_complete_dump.sql:proxy_sds_calibrated"
        "proxy_sel_complete_dump.sql:proxy_sel"
        "proxy_sel_calibrated_complete_dump.sql:proxy_sel_calibrated"
    )
    
    echo "🔍 Checking for SQL dumps in EFS mount: $dump_dir..."
    
    # Check if EFS is mounted and has files
    if [ ! -d "$dump_dir" ]; then
        echo "⚠️  EFS mount point not found: $dump_dir"
        echo "   Running with empty databases"
        return
    fi
    
    # List available files
    echo "📁 Available files in EFS:"
    ls -la "$dump_dir"
    echo ""
    
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

# Add ECS metadata logging if available
if [ -n "$ECS_CONTAINER_METADATA_URI_V4" ]; then
    echo "🔍 ECS Task Metadata:"
    curl -s "$ECS_CONTAINER_METADATA_URI_V4/task" | jq '.Family, .Revision, .DesiredStatus' 2>/dev/null || echo "   Metadata URI available"
fi

echo ""

# Start the Node.js application
exec node server.js
