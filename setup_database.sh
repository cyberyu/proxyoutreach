#!/bin/bash

# MySQL Setup Script for Proxy Account Outreach Application

echo "=== Proxy Account Outreach Database Setup ==="
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    echo "Ubuntu/Debian: sudo apt install mysql-server"
    echo "CentOS/RHEL: sudo yum install mysql-server"
    echo "macOS: brew install mysql"
    exit 1
fi

echo "✅ MySQL found"

# Detect MySQL authentication method
echo "Detecting MySQL authentication method..."

# Test connection methods
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ MySQL root connection without password works"
    mysql_user="root"
    mysql_password=""
    use_sudo=""
elif sudo mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ MySQL root connection with sudo works (Ubuntu/Debian auth_socket)"
    mysql_user="root"
    mysql_password=""
    use_sudo="sudo "
else
    echo "❌ Neither connection method worked. Please provide credentials:"
    read -p "Enter MySQL username (default: root): " mysql_user
    mysql_user=${mysql_user:-root}
    
    read -s -p "Enter MySQL password: " mysql_password
    echo ""
    use_sudo=""
fi

# Set database name to 'proxy'
db_name="proxy"

echo ""
echo "Setting up database with:"
echo "  Username: $mysql_user"
echo "  Database: $db_name"
echo ""

# Test MySQL connection
echo "Testing MySQL connection..."
if [ -n "$mysql_password" ]; then
    ${use_sudo}mysql -u "$mysql_user" -p"$mysql_password" -e "SELECT 1;" &> /dev/null
else
    ${use_sudo}mysql -u "$mysql_user" -e "SELECT 1;" &> /dev/null
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to MySQL. Please check your credentials."
    exit 1
fi

echo "✅ MySQL connection successful"

# Create database and run setup script
echo "Creating database and tables..."

# Create MySQL command based on whether password is needed
if [ -n "$mysql_password" ]; then
    mysql_cmd="${use_sudo}mysql -u $mysql_user -p$mysql_password"
else
    mysql_cmd="${use_sudo}mysql -u $mysql_user"
fi

# Run the database creation script
$mysql_cmd << EOF
CREATE DATABASE IF NOT EXISTS $db_name;
USE $db_name;

-- Table for unvoted accounts data
CREATE TABLE IF NOT EXISTS account_unvoted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    row_index INT,
    unnamed_col VARCHAR(50),
    proposal_master_skey BIGINT,
    director_master_skey BIGINT,
    account_type VARCHAR(10),
    shares_summable DECIMAL(15,4),
    rank_of_shareholding BIGINT,
    score_model1 DECIMAL(20,15),
    prediction_model1 TINYINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_shares (shares_summable),
    INDEX idx_rank (rank_of_shareholding)
);

-- Table for voted accounts data  
CREATE TABLE IF NOT EXISTS account_voted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    row_index INT,
    unnamed_col VARCHAR(50),
    proposal_master_skey BIGINT,
    director_master_skey BIGINT,
    account_type VARCHAR(10),
    shares_summable DECIMAL(15,4),
    rank_of_shareholding BIGINT,
    score_model2 DECIMAL(20,15),
    prediction_model2 TINYINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_shares (shares_summable),
    INDEX idx_rank (rank_of_shareholding)
);

-- Original accounts table for outreach management
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(255) UNIQUE NOT NULL,
    account_name VARCHAR(255),
    voting_status ENUM('voted', 'unvoted') DEFAULT 'unvoted',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    outreach_status ENUM('pending', 'contacted', 'responded', 'completed') DEFAULT 'pending',
    last_contact_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_voting_status (voting_status),
    INDEX idx_outreach_status (outreach_status),
    INDEX idx_account_id (account_id)
);

-- Original outreach_logs table
CREATE TABLE IF NOT EXISTS outreach_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    contact_method ENUM('email', 'phone', 'meeting') NOT NULL,
    contact_date DATE NOT NULL,
    outcome VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_contact_date (contact_date)
);
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database and tables created successfully"
else
    echo "❌ Failed to create database and tables"
    exit 1
fi

# Import CSV data
echo ""
echo "Importing CSV data..."

# Check if CSV files exist
if [ ! -f "df_2025_279_account_unvoted_sorted.csv" ]; then
    echo "⚠️  Warning: df_2025_279_account_unvoted_sorted.csv not found"
    unvoted_exists=false
else
    unvoted_exists=true
fi

if [ ! -f "df_2025_279_account_voted_sorted.csv" ]; then
    echo "⚠️  Warning: df_2025_279_account_voted_sorted.csv not found"
    voted_exists=false
else
    voted_exists=true
fi

# Import unvoted accounts if file exists
if [ "$unvoted_exists" = true ]; then
    echo "📥 Importing unvoted accounts data..."
    
    # Create the MySQL command
    if [ -n "$mysql_password" ]; then
        mysql_import_cmd="${use_sudo}mysql -u $mysql_user -p$mysql_password $db_name --local-infile=1"
        mysql_count_cmd="${use_sudo}mysql -u $mysql_user -p$mysql_password"
    else
        mysql_import_cmd="${use_sudo}mysql -u $mysql_user $db_name --local-infile=1"
        mysql_count_cmd="${use_sudo}mysql -u $mysql_user"
    fi
    
    # Execute the import
    $mysql_import_cmd << 'EOF'
LOAD DATA LOCAL INFILE 'df_2025_279_account_unvoted_sorted.csv'
INTO TABLE account_unvoted
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(row_index, unnamed_col, proposal_master_skey, director_master_skey, account_type, shares_summable, rank_of_shareholding, score_model1, prediction_model1);
EOF
    
    if [ $? -eq 0 ]; then
        unvoted_count=$($mysql_count_cmd -N -e "USE $db_name; SELECT COUNT(*) FROM account_unvoted;")
        echo "✅ Imported $unvoted_count unvoted account records"
    else
        echo "❌ Failed to import unvoted accounts data"
    fi
fi

# Import voted accounts if file exists
if [ "$voted_exists" = true ]; then
    echo "📥 Importing voted accounts data..."
    
    # Create the MySQL command
    if [ -n "$mysql_password" ]; then
        mysql_import_cmd="${use_sudo}mysql -u $mysql_user -p$mysql_password $db_name --local-infile=1"
        mysql_count_cmd="${use_sudo}mysql -u $mysql_user -p$mysql_password"
    else
        mysql_import_cmd="${use_sudo}mysql -u $mysql_user $db_name --local-infile=1"
        mysql_count_cmd="${use_sudo}mysql -u $mysql_user"
    fi
    
    # Execute the import
    $mysql_import_cmd << 'EOF'
LOAD DATA LOCAL INFILE 'df_2025_279_account_voted_sorted.csv'
INTO TABLE account_voted
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(row_index, unnamed_col, proposal_master_skey, director_master_skey, account_type, shares_summable, rank_of_shareholding, score_model2, prediction_model2);
EOF
    
    if [ $? -eq 0 ]; then
        voted_count=$($mysql_count_cmd -N -e "USE $db_name; SELECT COUNT(*) FROM account_voted;")
        echo "✅ Imported $voted_count voted account records"
    else
        echo "❌ Failed to import voted accounts data"
    fi
fi

# Update server.js with credentials (optional)
echo ""
read -p "Do you want to update server.js with these database credentials? (y/N): " update_server

if [[ $update_server =~ ^[Yy]$ ]]; then
    # Create a backup
    cp server.js server.js.backup
    
    # Update the database configuration
    sed -i "s/user: 'root'/user: '$mysql_user'/g" server.js
    sed -i "s/password: 'password'/password: '$mysql_password'/g" server.js
    sed -i "s/database: 'proxy_outreach'/database: '$db_name'/g" server.js
    
    echo "✅ server.js updated with new credentials"
    echo "📝 Backup saved as server.js.backup"
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Summary:"
echo "  Database: $db_name"
if [ "$unvoted_exists" = true ]; then
    echo "  Table: account_unvoted (with imported data)"
fi
if [ "$voted_exists" = true ]; then
    echo "  Table: account_voted (with imported data)"
fi
echo "  Table: accounts (for outreach management)"
echo "  Table: outreach_logs (for tracking contacts)"
echo ""
echo "Next steps:"
echo "1. Run 'npm start' or 'npm run dev' to start the application"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Use the web interface to manage outreach activities"
echo ""
echo "📝 Query examples:"
echo "  mysql -u $mysql_user -p$mysql_password -e 'USE $db_name; SELECT COUNT(*) FROM account_unvoted;'"
echo "  mysql -u $mysql_user -p$mysql_password -e 'USE $db_name; SELECT COUNT(*) FROM account_voted;'"
echo ""
