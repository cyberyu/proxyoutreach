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
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';"
mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';"
mysql -u root -e "FLUSH PRIVILEGES;"

# Create proxy_sds database and grants
mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sds;"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';"
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

# Import proxy database from SQL dump as webapp (avoids root auth races)
if [ -f "/tmp/proxy_complete_dump.sql" ]; then
    echo "📊 Importing proxy database from optimized SQL dump..."
    echo "🔧 Using fast import method (like reference container)..."
    echo "💡 File size: $(du -h /tmp/proxy_complete_dump.sql | cut -f1)"
    echo "⏰ Started at: $(date)"

    # Use same import method as reference container for maximum speed
    mysql -u webapp -pwebapppass proxy < /tmp/proxy_complete_dump.sql

    if [ $? -eq 0 ]; then
        echo "✅ Proxy database imported successfully!"
        echo "⏰ Completed at: $(date)"
    else
        echo "❌ Proxy database import failed with exit code $?"
        echo "🔍 Checking MySQL error log..."
        tail -20 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL error log found"
        exit 1
    fi
else
    echo "⚠️ /tmp/proxy_complete_dump.sql not found"
    exit 1
fi

# Import proxy_sds database from SQL dump as webapp
if [ -f "/tmp/proxy_sds_complete_dump.sql" ]; then
    echo "📋 Importing proxy_sds database from optimized SQL dump..."
    echo "🔧 Using fast import method (like reference container)..."
    echo "💡 File size: $(du -h /tmp/proxy_sds_complete_dump.sql | cut -f1)"
    echo "⏰ Started at: $(date)"

    # Use same import method as reference container for maximum speed
    mysql -u webapp -pwebapppass proxy_sds < /tmp/proxy_sds_complete_dump.sql

    if [ $? -eq 0 ]; then
        echo "✅ Proxy SDS database imported successfully!"
        echo "⏰ Completed at: $(date)"
    else
        echo "❌ Proxy SDS database import failed with exit code $?"
        echo "🔍 Checking MySQL error log..."
        tail -20 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL error log found"
        exit 1
    fi
else
    echo "⚠️ /tmp/proxy_sds_complete_dump.sql not found"
    exit 1
fi

# Reset MySQL settings to defaults (best-effort)
echo "🔧 Ensuring MySQL uses default settings..."

# Clean up large SQL dumps to save space
rm -f /tmp/proxy_complete_dump.sql /tmp/proxy_sds_complete_dump.sql

# Start the Node.js application
echo "🌐 Starting Node.js application..."
cd /usr/src/app
exec npm start
