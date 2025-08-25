#!/bin/bash

# Setup both proxy and proxy_sds databases with proper schemas

set -e

echo "🔧 Setting up MySQL databases and users..."

# Create databases and configure users (MySQL starts with no root password initially)
# Build the mysql command depending on whether MYSQL_ROOT_PASSWORD is provided
if [ -n "${MYSQL_ROOT_PASSWORD}" ]; then
    MYSQL_CMD=(mysql --protocol=TCP -u root -p"${MYSQL_ROOT_PASSWORD}")
else
    MYSQL_CMD=(mysql -u root)
fi

# Execute SQL using the computed command
"${MYSQL_CMD[@]}" << EOF
-- Create databases
CREATE DATABASE IF NOT EXISTS proxy;
CREATE DATABASE IF NOT EXISTS proxy_sds;

-- Create webapp user with privileges for both databases
CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Grant privileges for proxy database
GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';

-- Grant privileges for proxy_sds database
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';

FLUSH PRIVILEGES;

-- Set root password LAST (safe if already set; will attempt to alter to the same value)
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF

echo "✅ Databases and users created successfully!"
echo "� Schema creation will be handled by SQL dump import..."
echo "✅ Database setup completed!"
