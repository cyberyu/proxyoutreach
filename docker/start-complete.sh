#!/bin/bash

# Optimized startup script for Proxy Account Outreach Docker container
# Uses SQL dumps for fast database import instead of slow CSV processing

set -e

echo "🚀 Starting Proxy Account Outreach Complete Setup (Optimized)..."

# Start MySQL service
echo "📦 Starting MySQL service..."
service mysql start

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
MAX_TRIES=30
TRIES=0
while ! mysqladmin ping -h"localhost" --silent; do
    TRIES=$((TRIES + 1))
    if [ $TRIES -gt $MAX_TRIES ]; then
        echo "❌ MySQL failed to start after $MAX_TRIES attempts"
        echo "Checking MySQL error log:"
        tail -20 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL error log found"
        exit 1
    fi
    echo "Attempt $TRIES/$MAX_TRIES - waiting for MySQL..."
    sleep 2
done

echo "✅ MySQL started successfully!"

# Create application user and grants while root still uses socket/no-password
echo "🔧 Creating application user and granting privileges (webapp)..."

# Create databases for all five proxy databases
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sds;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sds_calibrated;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sel;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sel_calibrated;"

# Create webapp user
mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';"
mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';"

# Grant privileges to all databases
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'%';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'%';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'%';"
mysql -u root -e "FLUSH PRIVILEGES;"

# Set root password LAST to avoid authentication race
echo "🔧 Setting root password (last)..."
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}'; FLUSH PRIVILEGES;" 2>/dev/null || echo "⚠️ Could not set root password (may already be set)"

# Small delay to ensure privileges are applied
sleep 1

# Change to application directory
cd /usr/src/app

# No MySQL optimizations - use defaults like reference container
echo "📊 Using default MySQL settings (like reference container)..."

# Import all five databases
DATABASES=(
    "proxy"
    "proxy_sds"
    "proxy_sds_calibrated"
    "proxy_sel"
    "proxy_sel_calibrated"
)

echo "📊 Importing ALL FIVE databases with enhanced encoding..."
echo "🔧 Using fast import method (like reference container)..."

for db in "${DATABASES[@]}"; do
    dump_file="/tmp/${db}_complete_dump.sql"
    
    if [ -f "$dump_file" ]; then
        echo ""
        echo "📋 Importing $db database..."
        echo "💡 File size: $(du -h "$dump_file" | cut -f1)"
        echo "⏰ Started at: $(date)"

        # Use same import method as reference container for maximum speed
        mysql -u webapp -pwebapppass "$db" < "$dump_file"

        if [ $? -eq 0 ]; then
            echo "✅ $db database imported successfully!"
            echo "⏰ Completed at: $(date)"
        else
            echo "❌ $db database import failed with exit code $?"
            echo "🔍 Checking MySQL error log..."
            tail -20 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL error log found"
            exit 1
        fi
    else
        echo "⚠️ $dump_file not found - skipping $db database"
    fi
done

# Reset MySQL settings to defaults (best-effort)
echo "🔧 Ensuring MySQL uses default settings..."

# Clean up all SQL dump files
echo "🧹 Cleaning up SQL dump files..."
rm -f /tmp/proxy_complete_dump.sql
rm -f /tmp/proxy_sds_complete_dump.sql
rm -f /tmp/proxy_sds_calibrated_complete_dump.sql
rm -f /tmp/proxy_sel_complete_dump.sql
rm -f /tmp/proxy_sel_calibrated_complete_dump.sql

# Start the Node.js application
echo "🌐 Starting Node.js application..."
cd /usr/src/app
exec npm start
