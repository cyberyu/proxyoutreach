#!/bin/bash

# Complete setup script for proxy_sds_calibrated database with SDS calibrated parquet data import

set -e

echo "🎯 proxy_sds_calibrated Database Setup and Data Import"
echo "====================================================="
echo ""

# Check dependencies
echo "🔍 Checking dependencies..."

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL client not found. Please install MySQL."
    exit 1
fi

# Check if Python and required packages are available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python3."
    exit 1
fi

# Check Python packages
echo "📦 Checking Python packages..."
python3 -c "import pandas, mysql.connector" 2>/dev/null || {
    echo "❌ Required Python packages missing. Installing..."
    echo "📥 Installing pandas and mysql-connector-python..."
    pip3 install pandas mysql-connector-python pyarrow || {
        echo "❌ Failed to install required packages. Please install manually:"
        echo "   pip3 install pandas mysql-connector-python pyarrow"
        exit 1
    }
}

echo "✅ Dependencies OK"
echo ""

# Check if SDS calibrated parquet files exist
echo "🔍 Checking SDS calibrated parquet files..."
UNVOTED_FILE="./backups/df_calibrated_SDS_account_unvoted_sorted.parquet"
VOTED_FILE="./backups/df_calibrated_SDS_account_voted_sorted.parquet"

if [ ! -f "$UNVOTED_FILE" ]; then
    echo "❌ SDS calibrated unvoted parquet file not found: $UNVOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

if [ ! -f "$VOTED_FILE" ]; then
    echo "❌ SDS calibrated voted parquet file not found: $VOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

echo "✅ SDS calibrated parquet files found"
echo "   📊 Unvoted: $UNVOTED_FILE ($(ls -lh "$UNVOTED_FILE" | awk '{print $5}'))"
echo "   📊 Voted: $VOTED_FILE ($(ls -lh "$VOTED_FILE" | awk '{print $5}'))"
echo ""

# Step 1: Setup database
echo "🏗️ STEP 1: Setting up proxy_sds_calibrated database..."
echo "--------------------------------------------------------"

if [ -f "./setup_proxy_sds_calibrated_database.sh" ]; then
    chmod +x ./setup_proxy_sds_calibrated_database.sh
    ./setup_proxy_sds_calibrated_database.sh
else
    echo "❌ Database setup script not found: ./setup_proxy_sds_calibrated_database.sh"
    exit 1
fi

echo ""
echo "✅ Database setup completed"
echo ""

# Step 2: Import SDS calibrated data using unified script
echo "📥 STEP 2: Importing both SDS calibrated account tables using unified script..."
echo "------------------------------------------------------------------------------"

if [ -f "./import_proxy_sds_calibrated_unified.py" ]; then
    echo "🚀 Starting SDS calibrated unified import for both tables..."
    python3 ./import_proxy_sds_calibrated_unified.py "$UNVOTED_FILE" "$VOTED_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ SDS calibrated unified import completed successfully"
    else
        echo "❌ SDS calibrated unified import failed"
        exit 1
    fi
else
    echo "❌ SDS calibrated unified import script not found: ./import_proxy_sds_calibrated_unified.py"
    exit 1
fi

echo ""

# Step 3: Verify the import
echo "🔍 STEP 3: Verifying SDS calibrated import results..."
echo "----------------------------------------------------"

# Check if we can connect and get record counts
python3 << 'EOF'
try:
    import mysql.connector
    
    # Try to connect
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='webapp',
            password='webapppass',
            database='proxy_sds_calibrated'
        )
    except:
        import getpass
        password = getpass.getpass("Enter MySQL root password for verification: ")
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password=password,
            database='proxy_sds_calibrated'
        )
    
    cursor = connection.cursor()
    
    # Get table counts
    cursor.execute("SELECT COUNT(*) FROM account_unvoted")
    unvoted_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM account_voted")
    voted_count = cursor.fetchone()[0]
    
    print(f"📊 Verification Results:")
    print(f"   account_unvoted: {unvoted_count:,} records")
    print(f"   account_voted: {voted_count:,} records")
    print(f"   Total SDS calibrated records: {unvoted_count + voted_count:,}")
    
    if unvoted_count > 0 and voted_count > 0:
        print("✅ SDS calibrated import verification successful!")
        
        # Show sample data
        print("\n🔍 Sample SDS calibrated data from account_unvoted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_unvoted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
            
        print("\n🔍 Sample SDS calibrated data from account_voted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_voted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
            
        # Show SDS calibrated model statistics
        print("\n📈 SDS Calibrated Model Performance Overview:")
        
        # Check score_model2 distribution for both tables
        for table in ['account_unvoted', 'account_voted']:
            cursor.execute(f"""
                SELECT 
                    AVG(score_model2) as avg_score,
                    MIN(score_model2) as min_score,
                    MAX(score_model2) as max_score
                FROM {table} 
                WHERE score_model2 IS NOT NULL
            """)
            stats = cursor.fetchone()
            if stats and stats[0] is not None:
                print(f"   📊 {table} - Score Model2: Avg={stats[0]:.4f}, Min={stats[1]:.4f}, Max={stats[2]:.4f}")
            
            cursor.execute(f"""
                SELECT 
                    AVG(prediction_model2) as avg_pred,
                    MIN(prediction_model2) as min_pred,
                    MAX(prediction_model2) as max_pred
                FROM {table} 
                WHERE prediction_model2 IS NOT NULL
            """)
            stats = cursor.fetchone()
            if stats and stats[0] is not None:
                print(f"   🎯 {table} - Prediction Model2: Avg={stats[0]:.4f}, Min={stats[1]:.4f}, Max={stats[2]:.4f}")
        
    else:
        print("❌ SDS calibrated import verification failed - no data found")
        exit(1)
    
    connection.close()
    
except Exception as e:
    print(f"❌ Verification failed: {e}")
    exit(1)
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SDS CALIBRATED SETUP COMPLETED SUCCESSFULLY!"
    echo "==============================================="
    echo ""
    echo "✅ Database: proxy_sds_calibrated"
    echo "✅ Tables: account_unvoted, account_voted"
    echo "✅ Data: Imported from SDS calibrated parquet files"
    echo "✅ User: webapp (password: webapppass)"
    echo "✅ Enhanced: SDS calibrated model predictions"
    echo ""
    echo "🔗 You can now connect to the SDS calibrated database using:"
    echo "   mysql -u webapp -pwebapppass proxy_sds_calibrated"
    echo ""
    echo "📝 Or use the database in your applications with:"
    echo "   Host: localhost"
    echo "   Database: proxy_sds_calibrated"
    echo "   User: webapp"
    echo "   Password: webapppass"
    echo ""
    echo "🔬 SDS Calibrated Features:"
    echo "   - Enhanced model predictions for proxy voting analysis"
    echo "   - Optimized indexing for score_model2 and prediction_model2"
    echo "   - Comprehensive account type and shareholding analysis"
    echo "   - Ready for advanced proxy outreach analytics"
    echo ""
else
    echo "❌ SDS calibrated setup verification failed"
    exit 1
fi
