#!/bin/bash

# Script to copy MySQL data directory for Docker image pre-loading

echo "Copying MySQL data directory for Docker pre-loading..."

# Stop MySQL service temporarily (if running)
sudo systemctl stop mysql 2>/dev/null || sudo service mysql stop 2>/dev/null || true

# Create docker/mysql-data directory
mkdir -p docker/mysql-data

# Copy the MySQL data directory (exclude slow logs and other temporary files)
echo "Copying MySQL data files..."
sudo cp -r /var/lib/mysql/. docker/mysql-data/

# Change ownership to current user so Docker can copy it
sudo chown -R $USER:$USER docker/mysql-data/

# Restart MySQL service
sudo systemctl start mysql 2>/dev/null || sudo service mysql start 2>/dev/null || true

echo "✅ MySQL data copied to docker/mysql-data/"
echo "The Docker image will now start with pre-loaded database!"

# Show size of copied data
echo "Data size: $(du -sh docker/mysql-data/ | cut -f1)"

# Show what databases are included
echo "Databases included:"
ls -la docker/mysql-data/ | grep "^d" | awk '{print $9}' | grep -v "^\\." | sort
