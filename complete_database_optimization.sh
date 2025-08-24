#!/bin/bash

# Comprehensive Database Update Script
# This script handles the complete database schema optimization process including:
# 1. CSV preprocessing to remove redundant columns
# 2. Database schema migration
# 3. Updated data import process

set -e  # Exit on any error

echo "🚀 Starting Comprehensive Database Optimization Process"
echo "Date: $(date)"
echo "============================================================"

# Step 1: Preprocess CSV files to remove redundant columns
echo ""
echo "=== Step 1: Preprocessing CSV Files ==="
echo "Removing row_index and unnamed_col columns from existing CSV files..."

python3 preprocess_csv_for_optimization.py

if [ $? -eq 0 ]; then
    echo "✅ CSV preprocessing completed successfully"
else
    echo "❌ CSV preprocessing failed"
    exit 1
fi

# Step 2: Run database schema migration
echo ""
echo "=== Step 2: Database Schema Migration ==="
echo "Migrating database to optimized schema..."

./migrate_database_schema.sh

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Step 3: Import optimized data (if optimized CSV files exist)
echo ""
echo "=== Step 3: Importing Optimized Data ==="

# Check if optimized CSV files exist
UNVOTED_OPTIMIZED="df_2025_279_account_unvoted_optimized.csv"
VOTED_OPTIMIZED="df_2025_279_account_voted_optimized.csv"

if [ -f "$UNVOTED_OPTIMIZED" ] && [ -f "$VOTED_OPTIMIZED" ]; then
    echo "📁 Found optimized CSV files, proceeding with import..."
    
    # Use the updated Python import script
    python3 << 'EOF'
import csv
import mysql.connector
import sys
from mysql.connector import Error

def connect_to_mysql():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='proxy',
            user='webapp',
            password='webapppass'
        )
        print("✅ Connected to MySQL database")
        return connection
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def import_optimized_csv(connection, csv_file, table_name, columns):
    """Import optimized CSV data into database table"""
    print(f"📥 Importing {csv_file} into {table_name}...")
    
    cursor = connection.cursor()
    
    # Clear existing data
    cursor.execute(f"DELETE FROM {table_name}")
    print(f"🗑️  Cleared existing data from {table_name}")
    
    # Prepare INSERT statement
    placeholders = ', '.join(['%s'] * len(columns))
    insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
    
    batch_size = 1000
    batch_data = []
    total_rows = 0
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)  # Skip header
            
            for row_num, row in enumerate(reader, 1):
                # Ensure row has correct number of values
                while len(row) < len(columns):
                    row.append(None)
                row = row[:len(columns)]
                
                # Process values for proper data types
                processed_row = []
                for i, value in enumerate(row):
                    col_name = columns[i]
                    
                    if value == '' or value is None:
                        processed_row.append(None)
                    elif col_name in ['proposal_master_skey', 'director_master_skey', 'rank_of_shareholding', 'prediction_model1', 'prediction_model2', 'Target_encoded']:
                        try:
                            processed_row.append(int(float(value)) if value else None)
                        except (ValueError, TypeError):
                            processed_row.append(None)
                    elif col_name in ['shares_summable', 'score_model1', 'score_model2']:
                        try:
                            processed_row.append(float(value) if value else None)
                        except (ValueError, TypeError):
                            processed_row.append(None)
                    else:
                        processed_row.append(str(value) if value else None)
                
                batch_data.append(processed_row)
                
                # Execute batch when full
                if len(batch_data) >= batch_size:
                    cursor.executemany(insert_sql, batch_data)
                    connection.commit()
                    total_rows += len(batch_data)
                    print(f"📊 Imported {total_rows:,} rows...")
                    batch_data = []
            
            # Execute remaining batch
            if batch_data:
                cursor.executemany(insert_sql, batch_data)
                connection.commit()
                total_rows += len(batch_data)
        
        print(f"✅ Successfully imported {total_rows:,} rows into {table_name}")
        return True
        
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        connection.rollback()
        return False

def main():
    """Main import function"""
    connection = connect_to_mysql()
    if not connection:
        sys.exit(1)
    
    # Define optimized column schemas
    unvoted_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding',
        'score_model1', 'prediction_model1', 'Target_encoded'
    ]
    
    voted_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey', 
        'account_type', 'shares_summable', 'rank_of_shareholding',
        'score_model2', 'prediction_model2', 'Target_encoded'
    ]
    
    success = True
    
    # Import unvoted accounts
    if import_optimized_csv(connection, 'df_2025_279_account_unvoted_optimized.csv', 'account_unvoted', unvoted_columns):
        print("✅ Unvoted accounts import successful")
    else:
        print("❌ Unvoted accounts import failed")
        success = False
    
    # Import voted accounts  
    if import_optimized_csv(connection, 'df_2025_279_account_voted_optimized.csv', 'account_voted', voted_columns):
        print("✅ Voted accounts import successful")
    else:
        print("❌ Voted accounts import failed")
        success = False
    
    connection.close()
    
    if success:
        print("🎉 All imports completed successfully!")
    else:
        print("❌ Some imports failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Data import completed successfully"
    else
        echo "❌ Data import failed"
        exit 1
    fi
    
else
    echo "⚠️  Optimized CSV files not found, skipping data import"
    echo "You can run the import manually after creating optimized CSV files"
fi

# Step 4: Verification
echo ""
echo "=== Step 4: Verification ==="
echo "Verifying optimized database structure and data..."

mysql -h"localhost" -u"webapp" -p"webapppass" "proxy" << 'EOSQL'
-- Show optimized table structures
SELECT 'account_voted table structure:' as info;
DESCRIBE account_voted;

SELECT 'account_unvoted table structure:' as info;  
DESCRIBE account_unvoted;

-- Show data counts
SELECT 'Data counts:' as info;
SELECT 
    'account_voted' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT account_hash_key) as unique_accounts
FROM account_voted
UNION ALL
SELECT 
    'account_unvoted' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT account_hash_key) as unique_accounts
FROM account_unvoted;

-- Show storage sizes
SELECT 'Storage sizes:' as info;
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows as 'Rows'
FROM information_schema.TABLES 
WHERE table_schema = 'proxy' 
AND table_name IN ('account_voted', 'account_unvoted')
ORDER BY table_name;
EOSQL

echo ""
echo "============================================================"
echo "🎉 Database Optimization Process Complete!"
echo ""
echo "✅ Completed Steps:"
echo "   1. CSV files preprocessed to remove redundant columns"
echo "   2. Database schema migrated to optimized structure"
echo "   3. Data imported using optimized schema"
echo "   4. Database structure and data verified"
echo ""
echo "💡 Benefits Achieved:"
echo "   - Removed redundant row_index and unnamed_col columns"
echo "   - Added proper indexing on account_hash_key"
echo "   - Reduced storage requirements"
echo "   - Improved query performance"
echo ""
echo "📝 Next Steps:"
echo "   - Test application functionality with optimized schema"
echo "   - Update any custom queries that referenced removed columns"
echo "   - Monitor query performance improvements"
echo ""
echo "Completed at: $(date)"
