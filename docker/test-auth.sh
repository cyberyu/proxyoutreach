#!/bin/bash

echo "=== Testing MySQL Authentication ==="

# Start MySQL
service mysql start

# Wait for startup
sleep 3

# Test initial connection
echo "Testing initial connection..."
mysql -u root -e "SELECT 1;" 2>&1

# Try to set password
echo "Setting root password..."
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123'; FLUSH PRIVILEGES;" 2>&1

# Test with password
echo "Testing with password..."
mysql -u root -proot123 -e "SELECT 1;" 2>&1

echo "=== End Test ==="
