#!/bin/bash

# Grant webapp user access to all proxy databases

set -e

echo "🔐 Granting webapp user access to all proxy databases..."

# Check if we're running with Docker or local MySQL
if [ -n "${MYSQL_ROOT_PASSWORD}" ]; then
    MYSQL_CMD=(mysql --protocol=TCP -u root -p"${MYSQL_ROOT_PASSWORD}")
    echo "📡 Using Docker MySQL with password"
else
    # Try with password first, then without
    echo "🔍 Attempting MySQL connection as root..."
    read -s -p "Enter MySQL root password (or press Enter if no password): " mysql_password
    echo
    
    if [ -n "$mysql_password" ]; then
        MYSQL_CMD=(mysql -u root -p"$mysql_password")
    else
        MYSQL_CMD=(mysql -u root)
    fi
fi

# Grant privileges to webapp user
echo "🏗️ Creating webapp user and granting access to all proxy databases..."
"${MYSQL_CMD[@]}" << EOF

-- Create webapp user with privileges (if not exists)
CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';
CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';

-- Grant privileges for proxy_sel database
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'%';

-- Grant privileges for proxy_sel_calibrated database
GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'%';

-- Grant privileges for proxy_sds_calibrated database
GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'%';

-- Grant privileges for proxy_sds database (if it exists)
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';

-- Grant some additional useful privileges
GRANT PROCESS ON *.* TO 'webapp'@'localhost';
GRANT PROCESS ON *.* TO 'webapp'@'%';

-- Grant FILE privilege for LOAD DATA INFILE operations
GRANT FILE ON *.* TO 'webapp'@'localhost';
GRANT FILE ON *.* TO 'webapp'@'%';

FLUSH PRIVILEGES;

-- Show current privileges for webapp user
SHOW GRANTS FOR 'webapp'@'localhost';

EOF

echo ""
echo "✅ webapp user privileges updated successfully!"
echo "📊 webapp user now has access to:"
echo "   - proxy_sel database"
echo "   - proxy_sel_calibrated database" 
echo "   - proxy_sds_calibrated database"
echo "   - proxy_sds database"
echo "👤 User: webapp"
echo "🔑 Password: webapppass"
echo ""
echo "🔍 You can now test access with:"
echo "   mysql -u webapp -pwebapppass -e 'SHOW DATABASES;'"
echo ""
echo "🚀 Ready for database operations!"
