#!/bin/bash

# Complete setup script for proxy_sel database with parquet data import

set -e

echo "🎯 proxy_sel Database Setup and Data Import"
echo "==========================================="
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

# Check if parquet files exist
echo "🔍 Checking parquet files..."
UNVOTED_FILE="./backups/df_2025_sel_666_account_unvoted_sorted.parquet"
VOTED_FILE="./backups/df_2025_sel_666_account_voted_sorted.parquet"

if [ ! -f "$UNVOTED_FILE" ]; then
    echo "❌ Unvoted parquet file not found: $UNVOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

if [ ! -f "$VOTED_FILE" ]; then
    echo "❌ Voted parquet file not found: $VOTED_FILE"
    echo "   Please ensure the file exists or update the path in the import scripts."
    exit 1
fi

echo "✅ Parquet files found"
echo "   📊 Unvoted: $UNVOTED_FILE"
echo "   📊 Voted: $VOTED_FILE"
echo ""

# Step 1: Setup database
echo "🏗️ STEP 1: Setting up proxy_sel database..."
echo "--------------------------------------------"

if [ -f "./setup_proxy_sel_database.sh" ]; then
    chmod +x ./setup_proxy_sel_database.sh
    ./setup_proxy_sel_database.sh
else
    echo "❌ Database setup script not found: ./setup_proxy_sel_database.sh"
    exit 1
fi

echo ""
echo "✅ Database setup completed"
echo ""

# Step 2: Import data using unified script
echo "📥 STEP 2: Importing both account tables using unified script..."
echo "----------------------------------------------------------------"

if [ -f "./import_proxy_sel_unified.py" ]; then
    echo "🚀 Starting unified import for both tables..."
    python3 ./import_proxy_sel_unified.py "$UNVOTED_FILE" "$VOTED_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Unified import completed successfully"
    else
        echo "❌ Unified import failed, trying individual imports..."
        
        # Fallback to individual imports
        echo "📥 Fallback: Importing account_unvoted data..."
        if [ -f "./import_proxy_sel_account_unvoted.py" ]; then
            python3 ./import_proxy_sel_account_unvoted.py "$UNVOTED_FILE"
            
            if [ $? -eq 0 ]; then
                echo "✅ account_unvoted import completed successfully"
            else
                echo "❌ account_unvoted import failed"
                exit 1
            fi
        else
            echo "❌ Import script not found: ./import_proxy_sel_account_unvoted.py"
            exit 1
        fi
        
        echo "📥 Fallback: Importing account_voted data..."
        if [ -f "./import_proxy_sel_account_voted.py" ]; then
            python3 ./import_proxy_sel_account_voted.py "$VOTED_FILE"
            
            if [ $? -eq 0 ]; then
                echo "✅ account_voted import completed successfully"
            else
                echo "❌ account_voted import failed"
                exit 1
            fi
        else
            echo "❌ Import script not found: ./import_proxy_sel_account_voted.py"
            exit 1
        fi
    fi
else
    echo "❌ Unified import script not found: ./import_proxy_sel_unified.py"
    echo "📥 Falling back to individual imports..."
    
    # Individual imports as fallback
    if [ -f "./import_proxy_sel_account_unvoted.py" ]; then
        echo "🚀 Starting account_unvoted import..."
        python3 ./import_proxy_sel_account_unvoted.py "$UNVOTED_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ account_unvoted import completed successfully"
        else
            echo "❌ account_unvoted import failed"
            exit 1
        fi
    else
        echo "❌ Import script not found: ./import_proxy_sel_account_unvoted.py"
        exit 1
    fi
    
    if [ -f "./import_proxy_sel_account_voted.py" ]; then
        echo "🚀 Starting account_voted import..."
        python3 ./import_proxy_sel_account_voted.py "$VOTED_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ account_voted import completed successfully"
        else
            echo "❌ account_voted import failed"
            exit 1
        fi
    else
        echo "❌ Import script not found: ./import_proxy_sel_account_voted.py"
        exit 1
    fi
fi

# Step 3: Import Account_voted data
echo "📥 STEP 3: Importing account_voted data..."
echo "------------------------------------------"

if [ -f "./import_proxy_sel_account_voted.py" ]; then
    echo "🚀 Starting account_voted import..."
    python3 ./import_proxy_sel_account_voted.py "$VOTED_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ account_voted import completed successfully"
    else
        echo "❌ account_voted import failed"
        exit 1
    fi
else
    echo "❌ Import script not found: ./import_proxy_sel_account_voted.py"
    exit 1
fi

echo ""

# Step 3: Verify the import
echo "🔍 STEP 3: Verifying import results..."
echo "-------------------------------------"

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
            database='proxy_sel'
        )
    except:
        import getpass
        password = getpass.getpass("Enter MySQL root password for verification: ")
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password=password,
            database='proxy_sel'
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
    print(f"   Total records: {unvoted_count + voted_count:,}")
    
    if unvoted_count > 0 and voted_count > 0:
        print("✅ Import verification successful!")
        
        # Show sample data
        print("\n🔍 Sample data from account_unvoted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_unvoted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
            
        print("\n🔍 Sample data from account_voted:")
        cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_voted LIMIT 3")
        for row in cursor.fetchall():
            print(f"   {row}")
    else:
        print("❌ Import verification failed - no data found")
        exit(1)
    
    connection.close()
    
except Exception as e:
    print(f"❌ Verification failed: {e}")
    exit(1)
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SETUP COMPLETED SUCCESSFULLY!"
    echo "================================"
    echo ""
    echo "✅ Database: proxy_sel"
    echo "✅ Tables: account_unvoted, account_voted"
    echo "✅ Data: Imported from parquet files"
    echo "✅ User: webapp (password: webapppass)"
    echo ""
    echo "🔗 You can now connect to the database using:"
    echo "   mysql -u webapp -pwebapppass proxy_sel"
    echo ""
    echo "📝 Or use the database in your applications with:"
    echo "   Host: localhost"
    echo "   Database: proxy_sel"
    echo "   User: webapp"
    echo "   Password: webapppass"
    echo ""
else
    echo "❌ Setup verification failed"
    exit 1
fi
