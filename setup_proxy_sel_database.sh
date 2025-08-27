#!/bin/bash

# Setup proxy_sel database with proper schema for account tables

set -e

echo "🔧 Setting up proxy_sel database..."

# Check if we're running with Docker or local MySQL
if [ -n "${MYSQL_ROOT_PASSWORD}" ]; then
    MYSQL_CMD=(mysql --protocol=TCP -u root -p"${MYSQL_ROOT_PASSWORD}")
    echo "📡 Using Docker MySQL with password"
else
    # Try with password first, then without
    echo "🔍 Attempting MySQL connection..."
    read -s -p "Enter MySQL root password (or press Enter if no password): " mysql_password
    echo
    
    if [ -n "$mysql_password" ]; then
        MYSQL_CMD=(mysql -u root -p"$mysql_password")
    else
        MYSQL_CMD=(mysql -u root)
    fi
fi

# Create database and configure users
echo "🏗️ Creating proxy_sel database and setting up users..."
"${MYSQL_CMD[@]}" << EOF
-- Create proxy_sel database
CREATE DATABASE IF NOT EXISTS proxy_sel;

-- Create webapp user with privileges (if not exists)
CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';
CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';

-- Grant privileges for proxy_sel database
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'localhost';
GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'%';

FLUSH PRIVILEGES;

-- Use the new database
USE proxy_sel;

-- Create account_unvoted table
CREATE TABLE IF NOT EXISTS account_unvoted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_hash_key VARCHAR(255) NOT NULL,
    proposal_master_skey INT,
    director_master_skey INT,
    account_type VARCHAR(50),
    shares_summable BIGINT,
    rank_of_shareholding INT,
    score_model2 DECIMAL(10,6),
    prediction_model2 DECIMAL(10,6),
    Target_encoded INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_hash (account_hash_key),
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_rank (rank_of_shareholding)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create account_voted table
CREATE TABLE IF NOT EXISTS account_voted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_hash_key VARCHAR(255) NOT NULL,
    proposal_master_skey INT,
    director_master_skey INT,
    account_type VARCHAR(50),
    shares_summable BIGINT,
    rank_of_shareholding INT,
    score_model2 DECIMAL(10,6),
    prediction_model2 DECIMAL(10,6),
    Target_encoded INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_hash (account_hash_key),
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_rank (rank_of_shareholding)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

EOF

echo "✅ proxy_sel database and tables created successfully!"
echo "📊 Database: proxy_sel"
echo "📋 Tables created:"
echo "   - account_unvoted (with indexes)"
echo "   - account_voted (with indexes)"
echo "👤 User: webapp (with full privileges)"
echo ""
echo "🎯 Ready for parquet file import!"
