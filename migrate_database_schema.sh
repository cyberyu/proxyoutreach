#!/bin/bash

# Database Schema Migration Script
# This script migrates existing data to the optimized schema without row_index and unnamed_col

# Set database connection details
DB_HOST="localhost"
DB_USER="webapp"
DB_PASS="webapppass"
DB_NAME="proxy"

echo "Starting database schema optimization migration..."
echo "Date: $(date)"

# Function to execute SQL with error checking
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executing: $description"
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$sql"
    if [ $? -eq 0 ]; then
        echo "✅ Success: $description"
    else
        echo "❌ Failed: $description"
        exit 1
    fi
}

# Step 1: Create backup tables
echo "=== Step 1: Creating backup tables ==="
execute_sql "CREATE TABLE account_voted_backup_$(date +%Y%m%d) AS SELECT * FROM account_voted;" "Create account_voted backup"
execute_sql "CREATE TABLE account_unvoted_backup_$(date +%Y%m%d) AS SELECT * FROM account_unvoted;" "Create account_unvoted backup"

# Step 2: Check current table structure
echo "=== Step 2: Analyzing current table structure ==="
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE account_voted;"
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE account_unvoted;"

# Step 3: Create new optimized tables
echo "=== Step 3: Creating optimized table structures ==="

execute_sql "CREATE TABLE account_voted_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_hash_key VARCHAR(255) NOT NULL,
    proposal_master_skey BIGINT,
    director_master_skey BIGINT,
    account_type VARCHAR(10),
    shares_summable DECIMAL(15,4),
    rank_of_shareholding BIGINT,
    score_model2 DECIMAL(20,15),
    prediction_model2 TINYINT,
    Target_encoded INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_hash (account_hash_key),
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_shares (shares_summable),
    INDEX idx_rank (rank_of_shareholding)
);" "Create optimized account_voted_new table"

execute_sql "CREATE TABLE account_unvoted_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_hash_key VARCHAR(255) NOT NULL,
    proposal_master_skey BIGINT,
    director_master_skey BIGINT,
    account_type VARCHAR(10),
    shares_summable DECIMAL(15,4),
    rank_of_shareholding BIGINT,
    score_model1 DECIMAL(20,15),
    prediction_model1 TINYINT,
    Target_encoded INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_hash (account_hash_key),
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_shares (shares_summable),
    INDEX idx_rank (rank_of_shareholding)
);" "Create optimized account_unvoted_new table"

# Step 4: Migrate data (excluding row_index and unnamed_col)
echo "=== Step 4: Migrating data to optimized tables ==="

execute_sql "INSERT INTO account_voted_new (
    account_hash_key, proposal_master_skey, director_master_skey,
    account_type, shares_summable, rank_of_shareholding, 
    score_model2, prediction_model2, Target_encoded, created_at
)
SELECT 
    account_hash_key, proposal_master_skey, director_master_skey,
    account_type, shares_summable, rank_of_shareholding,
    score_model2, prediction_model2, Target_encoded, created_at
FROM account_voted;" "Migrate account_voted data"

execute_sql "INSERT INTO account_unvoted_new (
    account_hash_key, proposal_master_skey, director_master_skey,
    account_type, shares_summable, rank_of_shareholding,
    score_model1, prediction_model1, Target_encoded, created_at
)
SELECT 
    account_hash_key, proposal_master_skey, director_master_skey,
    account_type, shares_summable, rank_of_shareholding,
    score_model1, prediction_model1, Target_encoded, created_at
FROM account_unvoted;" "Migrate account_unvoted data"

# Step 5: Verify data integrity
echo "=== Step 5: Verifying data integrity ==="
VOTED_OLD_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM account_voted;")
VOTED_NEW_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM account_voted_new;")
UNVOTED_OLD_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM account_unvoted;")
UNVOTED_NEW_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM account_unvoted_new;")

echo "Data counts comparison:"
echo "account_voted: $VOTED_OLD_COUNT (old) vs $VOTED_NEW_COUNT (new)"
echo "account_unvoted: $UNVOTED_OLD_COUNT (old) vs $UNVOTED_NEW_COUNT (new)"

if [ "$VOTED_OLD_COUNT" = "$VOTED_NEW_COUNT" ] && [ "$UNVOTED_OLD_COUNT" = "$UNVOTED_NEW_COUNT" ]; then
    echo "✅ Data integrity verified - counts match"
    
    # Step 6: Replace old tables with new ones
    echo "=== Step 6: Replacing old tables with optimized ones ==="
    execute_sql "DROP TABLE account_voted;" "Drop old account_voted table"
    execute_sql "DROP TABLE account_unvoted;" "Drop old account_unvoted table"
    execute_sql "RENAME TABLE account_voted_new TO account_voted;" "Rename account_voted_new to account_voted"
    execute_sql "RENAME TABLE account_unvoted_new TO account_unvoted;" "Rename account_unvoted_new to account_unvoted"
    
    # Step 7: Show final optimized structure
    echo "=== Step 7: Final optimized table structure ==="
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE account_voted;"
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE account_unvoted;"
    
    # Show space savings
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
        table_rows as 'Rows'
    FROM information_schema.TABLES 
    WHERE table_schema = '$DB_NAME' 
    AND table_name IN ('account_voted', 'account_unvoted')
    ORDER BY table_name;"
    
    echo "🎉 Database schema optimization completed successfully!"
    echo "✅ Removed redundant row_index and unnamed_col columns"
    echo "✅ Added proper account_hash_key indexing"
    echo "✅ Optimized storage and improved query performance"
    
else
    echo "❌ Data integrity check failed - counts don't match!"
    echo "Rolling back changes..."
    execute_sql "DROP TABLE IF EXISTS account_voted_new;" "Cleanup account_voted_new"
    execute_sql "DROP TABLE IF EXISTS account_unvoted_new;" "Cleanup account_unvoted_new"
    exit 1
fi

echo "Migration completed at: $(date)"
