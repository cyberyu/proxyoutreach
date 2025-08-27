#!/bin/bash

# Complete setup script for proxy_sel_calibrated database with calibrated parquet data import

set -e

echo "🧪 proxy_sel_calibrated Database Setup and Calibrated Data Import"
echo "=================================================================="
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

# Check if calibrated parquet files exist
echo "🔍 Checking calibrated parquet files..."
UNVOTED_FILE="./backups/df_calibrated_sel_666_account_unvoted_sorted.parquet"
VOTED_FILE="./backups/df_calibrated_sel_666_account_voted_sorted.parquet"

if [ ! -f "$UNVOTED_FILE" ]; then
    echo "❌ Calibrated unvoted parquet file not found: $UNVOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

if [ ! -f "$VOTED_FILE" ]; then
    echo "❌ Calibrated voted parquet file not found: $VOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

echo "✅ Calibrated parquet files found"
echo "   🧪 Unvoted: $UNVOTED_FILE"
echo "   🧪 Voted: $VOTED_FILE"
echo ""

# Step 1: Setup database
echo "🏗️ STEP 1: Setting up proxy_sel_calibrated database..."
echo "-------------------------------------------------------"

if [ -f "./setup_proxy_sel_calibrated_database.sh" ]; then
    chmod +x ./setup_proxy_sel_calibrated_database.sh
    ./setup_proxy_sel_calibrated_database.sh
else
    echo "❌ Database setup script not found: ./setup_proxy_sel_calibrated_database.sh"
    exit 1
fi

echo ""
echo "✅ Calibrated database setup completed"
echo ""

# Step 2: Import calibrated data using unified script
echo "📥 STEP 2: Importing calibrated data using unified script..."
echo "-----------------------------------------------------------"

if [ -f "./import_proxy_sel_calibrated_unified.py" ]; then
    echo "🚀 Starting unified calibrated data import..."
    python3 ./import_proxy_sel_calibrated_unified.py "$UNVOTED_FILE" "$VOTED_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Unified calibrated data import completed successfully"
    else
        echo "❌ Unified calibrated data import failed"
        exit 1
    fi
else
    echo "❌ Unified import script not found: ./import_proxy_sel_calibrated_unified.py"
    exit 1
fi

echo ""

# Step 3: Verify the import
echo "🔍 STEP 3: Verifying calibrated data import results..."
echo "-----------------------------------------------------"

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
            database='proxy_sel_calibrated'
        )
    except:
        import getpass
        password = getpass.getpass("Enter MySQL root password for verification: ")
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password=password,
            database='proxy_sel_calibrated'
        )
    
    cursor = connection.cursor()
    
    # Get table counts
    cursor.execute("SELECT COUNT(*) FROM account_unvoted")
    unvoted_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM account_voted")
    voted_count = cursor.fetchone()[0]
    
    print(f"📊 Calibrated Data Verification Results:")
    print(f"   account_unvoted: {unvoted_count:,} records")
    print(f"   account_voted: {voted_count:,} records")
    print(f"   Total calibrated records: {unvoted_count + voted_count:,}")
    
    if unvoted_count > 0 and voted_count > 0:
        print("✅ Calibrated data import verification successful!")
        
        # Show sample calibrated data
        print("\n🔍 Sample calibrated data from account_unvoted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_unvoted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
            
        print("\n🔍 Sample calibrated data from account_voted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_voted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
            
        # Show calibration statistics
        print("\n📈 Calibrated Model Statistics:")
        cursor.execute("SELECT AVG(prediction_model2), MIN(prediction_model2), MAX(prediction_model2) FROM account_unvoted WHERE prediction_model2 IS NOT NULL")
        avg, min_val, max_val = cursor.fetchone()
        if avg is not None:
            print(f"   Unvoted predictions - Avg: {avg:.4f}, Min: {min_val:.4f}, Max: {max_val:.4f}")
        
        cursor.execute("SELECT AVG(prediction_model2), MIN(prediction_model2), MAX(prediction_model2) FROM account_voted WHERE prediction_model2 IS NOT NULL")
        avg, min_val, max_val = cursor.fetchone()
        if avg is not None:
            print(f"   Voted predictions - Avg: {avg:.4f}, Min: {min_val:.4f}, Max: {max_val:.4f}")
    else:
        print("❌ Calibrated data import verification failed - no data found")
        exit(1)
    
    connection.close()
    
except Exception as e:
    print(f"❌ Verification failed: {e}")
    exit(1)
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 CALIBRATED DATABASE SETUP COMPLETED SUCCESSFULLY!"
    echo "==================================================="
    echo ""
    echo "✅ Database: proxy_sel_calibrated"
    echo "✅ Tables: account_unvoted, account_voted"
    echo "✅ Data: Calibrated data imported from parquet files"
    echo "✅ User: webapp (password: webapppass)"
    echo ""
    echo "🔗 You can now connect to the calibrated database using:"
    echo "   mysql -u webapp -pwebapppass proxy_sel_calibrated"
    echo ""
    echo "📝 Or use the calibrated database in your applications with:"
    echo "   Host: localhost"
    echo "   Database: proxy_sel_calibrated"
    echo "   User: webapp"
    echo "   Password: webapppass"
    echo ""
    echo "🧪 This database contains calibrated model predictions optimized for accuracy."
    echo ""
else
    echo "❌ Calibrated database setup verification failed"
    exit 1
fi
