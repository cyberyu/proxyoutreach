#!/bin/bash
# startup-efs-option2.sh - Self-mounting EFS and loading SQL dumps
# Option 2: Container handles EFS mounting internally

set -e

echo "🚀 Starting Proxy Outreach with Self-Mounted EFS..."

# EFS Configuration
EFS_MOUNT_PATH="/usr/src/app/data/dumps"
EFS_FILE_SYSTEM_ID="${EFS_FILE_SYSTEM_ID:-fs-07c9b65956846dd51}"
EFS_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
TIMEOUT=60
COUNTER=0

# Install EFS utils if not present (for manual mounting)
if ! command -v mount.efs &> /dev/null; then
    echo "📦 Installing EFS utilities..."
    apt-get update -qq
    apt-get install -y amazon-efs-utils
fi

# Create mount point if it doesn't exist
mkdir -p "$EFS_MOUNT_PATH"

# Try to mount EFS if not already mounted
if ! mountpoint -q "$EFS_MOUNT_PATH"; then
    echo "🔗 Mounting EFS file system: $EFS_FILE_SYSTEM_ID"
    
    # Method 1: Try EFS helper (preferred)
    if command -v mount.efs &> /dev/null; then
        echo "   Using EFS mount helper..."
        mount -t efs -o tls "$EFS_FILE_SYSTEM_ID:/" "$EFS_MOUNT_PATH" || {
            echo "⚠️ EFS helper mount failed, trying NFS..."
            
            # Method 2: Fallback to NFS mount
            EFS_DNS="${EFS_FILE_SYSTEM_ID}.efs.${EFS_REGION}.amazonaws.com"
            mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,intr,timeo=600 \
                "$EFS_DNS:/" "$EFS_MOUNT_PATH" || {
                echo "❌ Both EFS mounting methods failed"
                echo "💡 Check network connectivity and EFS permissions"
                exit 1
            }
        }
    else
        # Method 2: NFS mount without EFS helper
        echo "   Using NFS mount..."
        EFS_DNS="${EFS_FILE_SYSTEM_ID}.efs.${EFS_REGION}.amazonaws.com"
        mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,intr,timeo=600 \
            "$EFS_DNS:/" "$EFS_MOUNT_PATH" || {
            echo "❌ NFS mount failed"
            echo "💡 Check network connectivity and EFS permissions"
            exit 1
        }
    fi
    
    echo "✅ EFS mounted successfully at $EFS_MOUNT_PATH"
else
    echo "✅ EFS already mounted at $EFS_MOUNT_PATH"
fi

# Wait for EFS mount to be available and populated
while [ ! -d "$EFS_MOUNT_PATH" ] || [ -z "$(ls -A $EFS_MOUNT_PATH 2>/dev/null)" ]; do
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "❌ Timeout waiting for EFS mount at $EFS_MOUNT_PATH"
        echo "💡 EFS may be empty or network issues"
        exit 1
    fi
    echo "⏳ Waiting for EFS mount... ($COUNTER/$TIMEOUT seconds)"
    sleep 1
    COUNTER=$((COUNTER + 1))
done

echo "✅ EFS mount detected at $EFS_MOUNT_PATH"

# List available SQL dumps
echo "📋 Available SQL dumps:"
ls -lh $EFS_MOUNT_PATH/*.sql 2>/dev/null || echo "  No SQL dumps found"

# Start MySQL service
echo "🔄 Starting MySQL service..."
service mysql start

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
MYSQL_READY=false
for i in {1..30}; do
    if mysqladmin ping -h localhost --silent; then
        echo "✅ MySQL is ready!"
        MYSQL_READY=true
        break
    fi
    echo "   Attempt $i/30 - MySQL not ready yet..."
    sleep 2
done

if [ "$MYSQL_READY" = false ]; then
    echo "❌ MySQL failed to start within timeout"
    exit 1
fi

# Create webapp user and set permissions
echo "🔧 Setting up database user and permissions..."
mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "
    CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
    CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
    CREATE DATABASE IF NOT EXISTS proxy;
    GRANT ALL PRIVILEGES ON proxy.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy.* TO '${MYSQL_USER}'@'%';
    FLUSH PRIVILEGES;
" 2>/dev/null || {
    echo "⚠️ User creation may have failed, user might already exist"
}

# Load SQL dumps if available with duplicate prevention
if [ -f "$EFS_MOUNT_PATH/proxy_complete_dump.sql" ]; then
    echo "📥 Found proxy database dump in EFS..."
    echo "📊 Dump size: $(du -h "$EFS_MOUNT_PATH/proxy_complete_dump.sql" | cut -f1)"
    
    # Check if database already has tables (avoid re-importing)
    table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D proxy -e "SHOW TABLES;" 2>/dev/null | wc -l)
    
    if [ "$table_count" -gt 1 ]; then
        echo "⚠️ Database already contains $((table_count-1)) tables"
        echo "🔄 Skipping import to avoid duplicates"
        echo "💡 To force re-import, delete the database first"
    else
        echo "🔄 Importing SQL dump (this may take several minutes)..."
        start_time=$(date +%s)
        
        if mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} proxy < "$EFS_MOUNT_PATH/proxy_complete_dump.sql"; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            echo "✅ Database restoration completed successfully!"
            echo "⏱️ Import took: ${duration} seconds"
            
            # Show table summary
            table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D proxy -e "SHOW TABLES;" 2>/dev/null | wc -l)
            echo "📊 Imported $((table_count-1)) tables"
        else
            echo "❌ Database restoration failed!"
            echo "🏗️ Continuing with empty database..."
        fi
    fi
else
    echo "⚠️ No proxy_complete_dump.sql found in EFS mount"
    echo "🔧 Continuing with empty database..."
    echo "💡 The application will create necessary tables automatically"
fi

echo "✅ Database setup complete"

# Start the Node.js application
echo "🚀 Starting Node.js application..."
cd /usr/src/app
exec node server.js
