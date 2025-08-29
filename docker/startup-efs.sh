#!/bin/bash
# startup-efs.sh - Load SQL dumps from EFS mount and start services
# Option 1: ECS-managed EFS mounting (expects EFS mounted by ECS task definition)

set -e

echo "=========================================="
echo "🚀 STARTUP-EFS.SH (Option 1) - ECS-Managed EFS"
echo "=========================================="
echo "⏰ Start time: $(date)"
echo "🏗️ Container ID: $(hostname)"
echo "🔧 Working directory: $(pwd)"
echo "👤 Running as user: $(whoami)"
echo "💾 Available memory: $(free -h | grep Mem)"
echo "📁 Mount points:"
mount | grep -E "(efs|nfs)" || echo "   No EFS/NFS mounts detected yet"
echo "=========================================="

# Wait for EFS mount to be available
EFS_MOUNT_PATH="/usr/src/app/data/dumps"
# Common SQL dump file names and locations to check for all databases
POSSIBLE_SQL_PATHS=(
    "${EFS_MOUNT_PATH}/dumps/proxy_complete_dump.sql"
    "${EFS_MOUNT_PATH}/dumps/proxy_sds_dump.sql"
    "${EFS_MOUNT_PATH}/dumps/proxy_sds_calibrated_dump.sql"
    "${EFS_MOUNT_PATH}/dumps/proxy_sel_dump.sql"
    "${EFS_MOUNT_PATH}/dumps/proxy_sel_calibrated_dump.sql"
    "${EFS_MOUNT_PATH}/proxy_complete_dump.sql"
    "${EFS_MOUNT_PATH}/../proxy_complete_dump.sql"
    "/usr/src/app/data/proxy_complete_dump.sql"
    "/usr/src/app/data/dumps/proxy_complete_dump.sql"
)
TIMEOUT=60
COUNTER=0

echo "🔍 Looking for EFS mount at: $EFS_MOUNT_PATH"
echo "⏳ Timeout configured: ${TIMEOUT} seconds"
echo "📋 Will search for SQL dumps in these locations:"
for path in "${POSSIBLE_SQL_PATHS[@]}"; do
    echo "   - $path"
done

while [ ! -d "$EFS_MOUNT_PATH" ] || [ -z "$(ls -A $EFS_MOUNT_PATH 2>/dev/null)" ]; do
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "❌ TIMEOUT REACHED waiting for EFS mount at $EFS_MOUNT_PATH"
        echo "📊 Debug information:"
        echo "   Directory exists: $([ -d "$EFS_MOUNT_PATH" ] && echo 'YES' || echo 'NO')"
        echo "   Directory contents: $(ls -la "$EFS_MOUNT_PATH" 2>/dev/null || echo 'CANNOT LIST')"
        echo "   Current mounts:"
        mount | grep -E "(efs|nfs)" || echo "   No EFS/NFS mounts found"
        echo "   All mount points:"
        mount | head -10
        exit 1
    fi
    
    # More detailed progress logging
    if [ $((COUNTER % 10)) -eq 0 ]; then
        echo "⏳ Waiting for EFS mount... ($COUNTER/$TIMEOUT seconds)"
        echo "   📁 Directory check: $([ -d "$EFS_MOUNT_PATH" ] && echo 'EXISTS' || echo 'MISSING')"
        echo "   📄 Content check: $([ -z "$(ls -A $EFS_MOUNT_PATH 2>/dev/null)" ] && echo 'EMPTY' || echo 'HAS_FILES')"
        echo "   🔍 Current mounts with EFS/NFS:"
        mount | grep -E "(efs|nfs)" | head -3 || echo "     No EFS/NFS mounts detected"
    fi
    
    sleep 1
    COUNTER=$((COUNTER + 1))
done

echo "✅ EFS mount detected at $EFS_MOUNT_PATH"
echo "📊 EFS Mount Details:"
echo "   Mount point: $EFS_MOUNT_PATH"
echo "   Directory size: $(du -sh "$EFS_MOUNT_PATH" 2>/dev/null || echo 'Cannot calculate')"
echo "   Directory permissions: $(ls -ld "$EFS_MOUNT_PATH" 2>/dev/null || echo 'Cannot check')"
echo "   Mount info: $(mount | grep "$EFS_MOUNT_PATH" || echo 'Not found in mount output')"

# List available SQL dumps
echo "📋 Available SQL dumps:"
if ls -lh $EFS_MOUNT_PATH/*.sql 2>/dev/null; then
    echo "   ✅ SQL dumps found!"
    echo "   📊 Total SQL files: $(ls -1 $EFS_MOUNT_PATH/*.sql 2>/dev/null | wc -l)"
else
    echo "   ⚠️ No SQL dumps found"
    echo "   📁 Directory contents:"
    ls -la "$EFS_MOUNT_PATH" 2>/dev/null || echo "   Cannot list directory contents"
fi

# Start MySQL service
echo "=========================================="
echo "🔄 Starting MySQL service..."
echo "⏰ MySQL start time: $(date)"
service mysql start

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
echo "🔧 MySQL connection details:"
echo "   Host: localhost"
echo "   Root password set: $([ -n "$MYSQL_ROOT_PASSWORD" ] && echo 'YES' || echo 'NO')"
echo "   User: ${MYSQL_USER:-NOT_SET}"
echo "   User password set: $([ -n "$MYSQL_PASSWORD" ] && echo 'YES' || echo 'NO')"

MYSQL_READY=false
for i in {1..30}; do
    if mysqladmin ping -h localhost --silent; then
        echo "✅ MySQL is ready!"
        echo "📊 MySQL status: $(mysqladmin -h localhost status 2>/dev/null || echo 'Status unavailable')"
        MYSQL_READY=true
        break
    fi
    
    # More detailed MySQL startup logging
    if [ $((i % 5)) -eq 0 ]; then
        echo "   Attempt $i/30 - MySQL not ready yet..."
        echo "   🔍 MySQL process: $(ps aux | grep mysql | grep -v grep | head -2)"
        echo "   📁 MySQL socket: $(ls -la /var/run/mysqld/ 2>/dev/null || echo 'Socket dir not found')"
    fi
    sleep 2
done

if [ "$MYSQL_READY" = false ]; then
    echo "❌ MySQL failed to start within timeout"
    echo "🔍 MySQL Debug Information:"
    echo "   MySQL process status: $(ps aux | grep mysql | grep -v grep || echo 'No MySQL processes')"
    echo "   MySQL error log: $(tail -20 /var/log/mysql/error.log 2>/dev/null || echo 'Error log not accessible')"
    echo "   MySQL service status: $(service mysql status 2>&1 || echo 'Service status unavailable')"
    exit 1
fi

# Create webapp user and set permissions
echo "=========================================="
echo "🔧 Setting up all five databases and user permissions..."
echo "⏰ User setup time: $(date)"
echo "🔑 Using root password: $([ -n "$MYSQL_ROOT_PASSWORD" ] && echo 'SET' || echo 'NOT_SET')"
echo "👤 Creating user: ${MYSQL_USER:-webapp}"
mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "
    CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
    CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
    CREATE DATABASE IF NOT EXISTS proxy;
    CREATE DATABASE IF NOT EXISTS proxy_sds;
    CREATE DATABASE IF NOT EXISTS proxy_sds_calibrated;
    CREATE DATABASE IF NOT EXISTS proxy_sel;
    CREATE DATABASE IF NOT EXISTS proxy_sel_calibrated;
    GRANT ALL PRIVILEGES ON proxy.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy.* TO '${MYSQL_USER}'@'%';
    GRANT ALL PRIVILEGES ON proxy_sds.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy_sds.* TO '${MYSQL_USER}'@'%';
    GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO '${MYSQL_USER}'@'%';
    GRANT ALL PRIVILEGES ON proxy_sel.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy_sel.* TO '${MYSQL_USER}'@'%';
    GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO '${MYSQL_USER}'@'%';
    FLUSH PRIVILEGES;
" 2>/dev/null || {
    echo "⚠️ User creation may have failed, user might already exist"
    echo "🔍 User creation debug:"
    echo "   MySQL root access: $(mysql -u root -p${MYSQL_ROOT_PASSWORD} -e 'SELECT 1' 2>/dev/null && echo 'SUCCESS' || echo 'FAILED')"
    echo "   Current users: $(mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT user,host FROM mysql.user" 2>/dev/null || echo 'Cannot list users')"
}

echo "✅ All five databases and user setup completed"

# Load SQL dumps if available with duplicate prevention
echo "=========================================="
echo "📥 Database restoration phase..."
echo "⏰ Restoration start time: $(date)"

# Search for SQL dumps for all databases
echo "🔍 Searching for SQL dump files for all five databases..."
echo "📁 EFS Mount Point: $EFS_MOUNT_PATH"

# Show comprehensive directory listing to help debug
echo "=========================================="
echo "📂 COMPREHENSIVE DIRECTORY LISTING FOR DEBUGGING:"
echo "📁 Contents of EFS mount point ($EFS_MOUNT_PATH):"
ls -la "$EFS_MOUNT_PATH/" 2>/dev/null || echo "   Cannot list EFS mount point"

echo "📁 Contents of dumps subdirectory (${EFS_MOUNT_PATH}/dumps/):"
ls -la "${EFS_MOUNT_PATH}/dumps/" 2>/dev/null || echo "   Dumps subdirectory does not exist or cannot be listed"

echo "📁 All SQL files in EFS mount point:"
find "$EFS_MOUNT_PATH" -name "*.sql" -type f 2>/dev/null | head -20 || echo "   No SQL files found or cannot search"

echo "📁 All files in /usr/src/app/data (recursively):"
find /usr/src/app/data -type f 2>/dev/null | head -20 || echo "   Cannot search /usr/src/app/data"
echo "=========================================="

# Define database mapping
declare -A DATABASE_DUMPS=(
    ["proxy"]="proxy_complete_dump.sql"
    ["proxy_sds"]="proxy_sds_complete_dump.sql"
    ["proxy_sds_calibrated"]="proxy_sds_calibrated_complete_dump.sql"
    ["proxy_sel"]="proxy_sel_complete_dump.sql"
    ["proxy_sel_calibrated"]="proxy_sel_calibrated_complete_dump.sql"
)

declare -A FOUND_DUMPS=()

# Search for each database dump
for db_name in "${!DATABASE_DUMPS[@]}"; do
    dump_file="${DATABASE_DUMPS[$db_name]}"
    echo "🔍 Searching for $db_name database dump: $dump_file"
    
    # Show exactly what paths we're checking
    echo "   📁 Checking path 1: ${EFS_MOUNT_PATH}/dumps/$dump_file"
    echo "      Exists: $([ -f "${EFS_MOUNT_PATH}/dumps/$dump_file" ] && echo 'YES' || echo 'NO')"
    
    echo "   📁 Checking path 2: ${EFS_MOUNT_PATH}/$dump_file"
    echo "      Exists: $([ -f "${EFS_MOUNT_PATH}/$dump_file" ] && echo 'YES' || echo 'NO')"
    
    # Check in primary dump directory
    if [ -f "${EFS_MOUNT_PATH}/dumps/$dump_file" ]; then
        FOUND_DUMPS["$db_name"]="${EFS_MOUNT_PATH}/dumps/$dump_file"
        echo "✅ Found $db_name dump: ${EFS_MOUNT_PATH}/dumps/$dump_file"
    elif [ -f "${EFS_MOUNT_PATH}/$dump_file" ]; then
        FOUND_DUMPS["$db_name"]="${EFS_MOUNT_PATH}/$dump_file"
        echo "✅ Found $db_name dump: ${EFS_MOUNT_PATH}/$dump_file"
    else
        # Try broader search
        echo "   📁 Performing broader search in /usr/src/app/data for: $dump_file"
        found_path=$(find /usr/src/app/data -name "$dump_file" -type f 2>/dev/null | head -1)
        if [ -n "$found_path" ]; then
            FOUND_DUMPS["$db_name"]="$found_path"
            echo "✅ Found $db_name dump via search: $found_path"
        else
            echo "❌ Not found: $dump_file for database $db_name"
            echo "   🔍 Let's see what files ARE in the EFS dumps directory:"
            echo "      Files in ${EFS_MOUNT_PATH}/dumps/:"
            ls -la "${EFS_MOUNT_PATH}/dumps/" 2>/dev/null | head -10 || echo "      Cannot list dumps directory"
            echo "      Files in ${EFS_MOUNT_PATH}/:"
            ls -la "${EFS_MOUNT_PATH}/" 2>/dev/null | head -10 || echo "      Cannot list EFS directory"
        fi
    fi
done

echo "📊 Summary of found dumps: ${#FOUND_DUMPS[@]} out of ${#DATABASE_DUMPS[@]} databases"

# Restore databases from found dumps
if [ ${#FOUND_DUMPS[@]} -gt 0 ]; then
    echo "🔄 Starting database restoration for ${#FOUND_DUMPS[@]} databases..."
    
    for db_name in "${!FOUND_DUMPS[@]}"; do
        dump_path="${FOUND_DUMPS[$db_name]}"
        echo "=========================================="
        echo "� Restoring database: $db_name"
        echo "📁 From dump: $dump_path"
        echo "📊 Dump details:"
        echo "   Size: $(du -h "$dump_path" | cut -f1)"
        echo "   Permissions: $(ls -la "$dump_path")"
        echo "   File type: $(file "$dump_path" 2>/dev/null || echo 'Cannot determine')"
        
        # Check if database already has tables (avoid re-importing)
        echo "🔍 Checking existing database state for $db_name..."
        table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES;" 2>/dev/null | wc -l)
        echo "   Current table count in $db_name: $table_count"
        
        if [ "$table_count" -gt 1 ]; then
            echo "⚠️ Database $db_name already contains $((table_count-1)) tables"
            echo "🔄 Skipping import to avoid duplicates"
            echo "💡 To force re-import, delete the database first"
            echo "📊 Existing tables in $db_name:"
            mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES;" 2>/dev/null | head -5
        else
            echo "🔄 Database $db_name is empty, proceeding with import..."
            echo "⚠️ This may take several minutes for large dumps..."
            start_time=$(date +%s)
            
            if mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} "$db_name" < "$dump_path"; then
                end_time=$(date +%s)
                duration=$((end_time - start_time))
                echo "✅ Database $db_name restoration completed successfully!"
                echo "⏱️ Import took: ${duration} seconds"
                
                # Show table summary
                table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES;" 2>/dev/null | wc -l)
                echo "📊 Successfully imported $((table_count-1)) tables into $db_name"
                echo "🔍 Table list (first 5):"
                mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES;" 2>/dev/null | head -5
            else
                echo "❌ Database $db_name restoration failed!"
                echo "🔍 Restoration debug:"
                echo "   MySQL user access: $(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -e 'SELECT 1' 2>/dev/null && echo 'SUCCESS' || echo 'FAILED')"
                echo "   Database exists: $(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -e "USE $db_name; SELECT 1" 2>/dev/null && echo 'YES' || echo 'NO')"
                echo "🏗️ Continuing with empty database..."
            fi
        fi
        echo "=========================================="
    done
    
    echo "✅ Database restoration phase completed!"
    echo "📊 Restored ${#FOUND_DUMPS[@]} out of ${#DATABASE_DUMPS[@]} possible databases"
else
    echo "⚠️ No SQL dump files found for any database"
    echo "🔍 Debug information:"
    echo "   Expected dump files:"
    for db_name in "${!DATABASE_DUMPS[@]}"; do
        echo "     - $db_name: ${DATABASE_DUMPS[$db_name]}"
    done
    echo "   EFS mount contents:"
    ls -la "$EFS_MOUNT_PATH" 2>/dev/null || echo "   Cannot list EFS directory"
    echo "   Available SQL files:"
    find /usr/src/app/data -name "*.sql" -type f 2>/dev/null || echo "   No .sql files found"
    echo "🔧 Continuing with empty databases..."
    echo "💡 The application will create necessary tables automatically"
fi

echo "=========================================="
echo "✅ Database setup complete"
echo "⏰ Database setup completed at: $(date)"

# Ensure all databases have outreach_logs table
echo "=========================================="
echo "🔧 Ensuring outreach_logs table exists in all databases..."
echo "⏰ Table synchronization start time: $(date)"

# First, get the outreach_logs table structure from proxy database
echo "🔍 Getting outreach_logs table structure from proxy database..."
OUTREACH_LOGS_STRUCTURE=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D proxy -e "SHOW CREATE TABLE outreach_logs\G" 2>/dev/null | grep "Create Table:" | sed 's/Create Table: //')

if [ -n "$OUTREACH_LOGS_STRUCTURE" ]; then
    echo "✅ Found outreach_logs table structure in proxy database"
    echo "📊 Table structure: ${OUTREACH_LOGS_STRUCTURE:0:100}..."
    
    # Check and create outreach_logs table in each database
    for db_name in proxy proxy_sds proxy_sds_calibrated proxy_sel proxy_sel_calibrated; do
        echo "🔍 Checking outreach_logs table in database: $db_name"
        
        # Check if outreach_logs table exists
        table_exists=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES LIKE 'outreach_logs';" 2>/dev/null | wc -l)
        
        if [ "$table_exists" -eq 0 ]; then
            echo "⚠️ outreach_logs table missing in $db_name, creating..."
            
            # Create the table with the same structure as proxy database
            if mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "$OUTREACH_LOGS_STRUCTURE" 2>/dev/null; then
                echo "✅ Successfully created outreach_logs table in $db_name"
                
                # Verify table was created
                verify_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES LIKE 'outreach_logs';" 2>/dev/null | wc -l)
                if [ "$verify_count" -eq 1 ]; then
                    echo "✅ Verified outreach_logs table exists in $db_name"
                    # Show table structure for confirmation
                    echo "📊 Table structure in $db_name:"
                    mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "DESCRIBE outreach_logs;" 2>/dev/null | head -5
                else
                    echo "❌ Failed to verify outreach_logs table in $db_name"
                fi
            else
                echo "❌ Failed to create outreach_logs table in $db_name"
                echo "🔍 Debug info:"
                echo "   Database access: $(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -e "USE $db_name; SELECT 1" 2>/dev/null && echo 'SUCCESS' || echo 'FAILED')"
                echo "   Table structure length: ${#OUTREACH_LOGS_STRUCTURE} characters"
            fi
        else
            echo "✅ outreach_logs table already exists in $db_name"
            # Show row count for existing table
            row_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SELECT COUNT(*) FROM outreach_logs;" 2>/dev/null | tail -1)
            echo "📊 Current row count in $db_name.outreach_logs: $row_count"
        fi
        echo "----------------------------------------"
    done
    
    echo "✅ outreach_logs table synchronization completed!"
    echo "📊 Summary:"
    for db_name in proxy proxy_sds proxy_sds_calibrated proxy_sel proxy_sel_calibrated; do
        table_exists=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SHOW TABLES LIKE 'outreach_logs';" 2>/dev/null | wc -l)
        if [ "$table_exists" -eq 1 ]; then
            row_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$db_name" -e "SELECT COUNT(*) FROM outreach_logs;" 2>/dev/null | tail -1)
            echo "   ✅ $db_name.outreach_logs: $row_count rows"
        else
            echo "   ❌ $db_name.outreach_logs: MISSING"
        fi
    done
else
    echo "⚠️ Could not find outreach_logs table in proxy database"
    echo "🔍 Debug information:"
    echo "   Proxy database access: $(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -e 'USE proxy; SELECT 1' 2>/dev/null && echo 'SUCCESS' || echo 'FAILED')"
    echo "   Tables in proxy database:"
    mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D proxy -e "SHOW TABLES;" 2>/dev/null | head -10
    echo "💡 Skipping outreach_logs synchronization - will rely on application to create tables"
fi

# Start the Node.js application
echo "=========================================="
echo "🚀 Starting Node.js application..."
echo "⏰ Node.js start time: $(date)"
echo "📁 Application directory: $(pwd)"
echo "📄 Application file: server.js"
echo "🔍 Server.js exists: $([ -f server.js ] && echo 'YES' || echo 'NO')"
echo "👤 Running as user: $(whoami)"
echo "🌐 Expected port: 3000"
echo "=========================================="
cd /usr/src/app
exec node server.js
