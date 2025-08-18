#!/bin/bash

# Start MySQL service
echo "Starting MySQL service..."
service mysql start

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
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

# Check if proxy database exists, if not restore from backup
if ! mysql -u root -e "USE proxy;" 2>/dev/null; then
    echo "🔄 Restoring database from backup..."
    
    # Create database and user
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy;"
    mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';"
    mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';"
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';"
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';"
    mysql -u root -e "FLUSH PRIVILEGES;"
    
    # Set root password
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';"
    
    # Restore database from backup
    mysql -u webapp -pwebapppass proxy < /tmp/proxy_backup.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database restored successfully from backup!"
        # Clean up the backup file to save space
        rm -f /tmp/proxy_backup.sql
    else
        echo "❌ Failed to restore database from backup"
        exit 1
    fi
else
    echo "✅ Proxy database already exists!"
fi

# Verify database exists and has data
TABLES=$(mysql -u webapp -pwebapppass proxy -e "SHOW TABLES;" 2>/dev/null | wc -l)
if [ $TABLES -gt 1 ]; then
    echo "✅ Database verified successfully! Found $((TABLES-1)) tables."
else
    echo "⚠️  Database verification failed, but continuing..."
fi

# Start the Node.js application
echo "Starting Node.js application..."
cd /usr/src/app
exec npm start
