#!/bin/bash

# Excel Import Script for Proposals Predictions
# Imports matched_results_279.xlsx into MySQL proposals_predictions table

echo "=== Excel Import Tool for Proposals Predictions ==="
echo ""

# Database settings
DB_NAME="proxy"
MYSQL_USER="root"
TABLE_NAME="proposals_predictions"
EXCEL_FILE="matched_results_279.xlsx"

# MySQL command (using sudo for Ubuntu auth_socket)
MYSQL_CMD="sudo mysql -u $MYSQL_USER"

echo "🔍 Checking database connection..."
if $MYSQL_CMD -e "USE $DB_NAME; SELECT 1;" &> /dev/null; then
    echo "✅ Connected to database: $DB_NAME"
else
    echo "❌ Cannot connect to database: $DB_NAME"
    exit 1
fi

echo ""

# Check if Excel file exists
if [ ! -f "$EXCEL_FILE" ]; then
    echo "❌ Error: $EXCEL_FILE not found in current directory"
    echo "   Please ensure the Excel file is in the same directory as this script"
    exit 1
fi

echo "📁 Found Excel file: $EXCEL_FILE"

# Check if table exists
echo "🔍 Checking if table '$TABLE_NAME' exists..."
table_exists=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='$TABLE_NAME';" 2>/dev/null)

if [ "$table_exists" -eq "0" ]; then
    echo "⚠️  Table '$TABLE_NAME' does not exist. Creating it..."
    
    $MYSQL_CMD -e "
    USE $DB_NAME;
    CREATE TABLE IF NOT EXISTS $TABLE_NAME (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposal_master_skey BIGINT,
        director_master_skey BIGINT,
        final_key VARCHAR(255),
        job_number VARCHAR(100),
        issuer_name VARCHAR(500),
        service VARCHAR(100),
        cusip6 VARCHAR(20),
        mt_date DATE,
        ml_date DATE,
        record_date DATE,
        mgmt_rec VARCHAR(50),
        proposal TEXT,
        proposal_type VARCHAR(200),
        director_number INT,
        director_name VARCHAR(300),
        category VARCHAR(200),
        subcategory VARCHAR(200),
        predicted_for_shares DECIMAL(20,2),
        predicted_against_shares DECIMAL(20,2),
        predicted_abstain_shares DECIMAL(20,2),
        predicted_unvoted_shares DECIMAL(20,2),
        total_for_shares DECIMAL(20,2),
        total_against_shares DECIMAL(20,2),
        total_abstain_shares DECIMAL(20,2),
        total_unvoted_shares DECIMAL(20,2),
        for_ratio_among_voted DECIMAL(10,6),
        for_ratio_among_elig DECIMAL(10,6),
        voting_ratio DECIMAL(10,6),
        for_ratio_among_voted_true DECIMAL(10,6),
        for_ratio_among_elig_true DECIMAL(10,6),
        voting_ratio_true DECIMAL(10,6),
        for_ratio_among_voted_incl_abs DECIMAL(10,6),
        for_ratio_among_elig_incl_abs DECIMAL(10,6),
        voting_ratio_incl_abs DECIMAL(10,6),
        for_ratio_among_voted_incl_abs_true DECIMAL(10,6),
        for_ratio_among_elig_incl_abs_true DECIMAL(10,6),
        voting_ratio_incl_abs_true DECIMAL(10,6),
        for_percentage DECIMAL(8,4),
        against_percentage DECIMAL(8,4),
        abstain_percentage DECIMAL(8,4),
        for_percentage_true DECIMAL(8,4),
        against_percentage_true DECIMAL(8,4),
        abstain_percentage_true DECIMAL(8,4),
        prediction_correct BOOLEAN,
        approved BOOLEAN,
        for_prospectus_2026 DECIMAL(8,4),
        against_prospectus_2026 VARCHAR(50),
        abstain_prospectus_2026 VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_proposal_master (proposal_master_skey),
        INDEX idx_director_master (director_master_skey),
        INDEX idx_job_number (job_number),
        INDEX idx_category (category),
        INDEX idx_prediction_correct (prediction_correct)
    );
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Table '$TABLE_NAME' created successfully"
    else
        echo "❌ Failed to create table '$TABLE_NAME'"
        exit 1
    fi
else
    echo "✅ Table '$TABLE_NAME' exists"
fi

# Check current record count
current_count=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM $TABLE_NAME;" 2>/dev/null || echo "0")
echo "📊 Current records in $TABLE_NAME: $current_count"

# Ask for confirmation if table has data
if [ "$current_count" -gt "0" ]; then
    echo ""
    echo "⚠️  Warning: Table '$TABLE_NAME' already contains $current_count records"
    echo "   This import will ADD new records (it won't replace existing ones)"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Import cancelled by user"
        exit 0
    fi
fi

echo ""
echo "🚀 Starting Excel import process..."

# Check if required Python packages are installed
echo "🔍 Checking Python dependencies..."
python3 -c "import pandas, mysql.connector, numpy" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Missing Python dependencies. Installing..."
    pip3 install pandas mysql-connector-python openpyxl numpy
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Python dependencies"
        exit 1
    fi
fi

# Run the Python import script
echo "📥 Executing Python import script..."
python3 import_excel_proposals.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Excel import completed successfully!"
    
    # Get final counts
    final_count=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM $TABLE_NAME;" 2>/dev/null || echo "0")
    new_records=$((final_count - current_count))
    
    echo ""
    echo "📊 Import Summary:"
    echo "  Previous records: $current_count"
    echo "  New records added: $new_records"
    echo "  Total records: $final_count"
    
    echo ""
    echo "📝 Verify with:"
    echo "  sudo mysql -u root -e 'USE $DB_NAME; SELECT COUNT(*) FROM $TABLE_NAME;'"
    echo "  sudo mysql -u root -e 'USE $DB_NAME; SELECT * FROM $TABLE_NAME LIMIT 5;'"
    echo "  sudo mysql -u root -e 'USE $DB_NAME; DESCRIBE $TABLE_NAME;'"
else
    echo ""
    echo "❌ Excel import failed!"
    echo "   Check the error messages above for details"
    exit 1
fi

echo ""
echo "✅ Import process completed!"
