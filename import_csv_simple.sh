#!/bin/bash

# Simple CSV Import Script using MySQL's mysqlimport or manual INSERT

echo "=== CSV Import Tool for Proxy Database ==="
echo ""

# Database settings
DB_NAME="proxy"
MYSQL_USER="root"

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

# Function to import CSV using Python and MySQL
import_csv_simple() {
    local csv_file="$1"
    local table_name="$2"
    local columns="$3"
    
    if [ ! -f "$csv_file" ]; then
        echo "⚠️  Warning: $csv_file not found"
        return 0
    fi
    
    echo "📥 Importing $csv_file to $table_name..."
    
    # Use Python to read CSV and generate SQL INSERT statements
    python3 << EOF
import csv
import sys

# Read CSV and generate INSERT statements
try:
    with open('$csv_file', 'r') as file:
        csv_reader = csv.reader(file)
        next(csv_reader)  # Skip header
        
        batch_size = 1000
        batch_count = 0
        total_count = 0
        
        print("-- SQL INSERT statements for $table_name")
        
        for row_num, row in enumerate(csv_reader, 1):
            # Handle empty values and convert types
            values = []
            for i, value in enumerate(row):
                if value == '' or value == 'NULL':
                    values.append('NULL')
                elif i in [0, 2, 3, 6]:  # Integer columns
                    try:
                        int_val = int(float(value)) if value else 0
                        values.append(str(int_val))
                    except:
                        values.append('NULL')
                elif i in [5]:  # Decimal columns
                    try:
                        float_val = float(value) if value else 0
                        values.append(str(float_val))
                    except:
                        values.append('NULL')
                elif i in [7]:  # Score columns (decimal)
                    try:
                        float_val = float(value) if value else 0
                        values.append(str(float_val))
                    except:
                        values.append('NULL')
                elif i in [8]:  # Prediction columns (integer)
                    try:
                        int_val = int(float(value)) if value else 0
                        values.append(str(int_val))
                    except:
                        values.append('0')
                else:  # String columns
                    escaped_value = value.replace("'", "''") if value else ''
                    values.append(f"'{escaped_value}'")
            
            # Generate INSERT statement
            values_str = ', '.join(values[:9])  # Take only first 9 values
            print(f"INSERT INTO $table_name ($columns) VALUES ({values_str});")
            
            total_count += 1
            batch_count += 1
            
            # Progress indicator
            if batch_count >= batch_size:
                print(f"-- Processed {total_count} records", file=sys.stderr)
                batch_count = 0
        
        print(f"-- Total records to import: {total_count}", file=sys.stderr)
        
except Exception as e:
    print(f"Error processing CSV: {e}", file=sys.stderr)
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Generated SQL statements for $csv_file"
        return 0
    else
        echo "❌ Failed to process $csv_file"
        return 1
    fi
}

# Import unvoted accounts
echo "Processing unvoted accounts..."
if [ -f "df_2025_279_account_unvoted_sorted.csv" ]; then
    import_csv_simple "df_2025_279_account_unvoted_sorted.csv" "account_unvoted" \
        "row_index, unnamed_col, proposal_master_skey, director_master_skey, account_type, shares_summable, rank_of_shareholding, score_model1, prediction_model1" \
        > unvoted_insert.sql 2>unvoted_progress.log
    
    if [ -s unvoted_insert.sql ]; then
        echo "📥 Executing SQL for unvoted accounts..."
        $MYSQL_CMD $DB_NAME < unvoted_insert.sql
        
        if [ $? -eq 0 ]; then
            unvoted_count=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM account_unvoted;")
            echo "✅ Imported $unvoted_count unvoted account records"
            rm unvoted_insert.sql unvoted_progress.log
        else
            echo "❌ Failed to import unvoted accounts"
        fi
    fi
else
    echo "⚠️  Warning: df_2025_279_account_unvoted_sorted.csv not found"
fi

echo ""

# Import voted accounts  
echo "Processing voted accounts..."
if [ -f "df_2025_279_account_voted_sorted.csv" ]; then
    import_csv_simple "df_2025_279_account_voted_sorted.csv" "account_voted" \
        "row_index, unnamed_col, proposal_master_skey, director_master_skey, account_type, shares_summable, rank_of_shareholding, score_model2, prediction_model2" \
        > voted_insert.sql 2>voted_progress.log
    
    if [ -s voted_insert.sql ]; then
        echo "📥 Executing SQL for voted accounts..."
        $MYSQL_CMD $DB_NAME < voted_insert.sql
        
        if [ $? -eq 0 ]; then
            voted_count=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM account_voted;")
            echo "✅ Imported $voted_count voted account records"
            rm voted_insert.sql voted_progress.log
        else
            echo "❌ Failed to import voted accounts"
        fi
    fi
else
    echo "⚠️  Warning: df_2025_279_account_voted_sorted.csv not found"
fi

echo ""
echo "🎉 Import process completed!"
echo ""
echo "📊 Final counts:"
total_unvoted=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM account_unvoted;" 2>/dev/null || echo "0")
total_voted=$($MYSQL_CMD -N -e "USE $DB_NAME; SELECT COUNT(*) FROM account_voted;" 2>/dev/null || echo "0")
echo "  Unvoted accounts: $total_unvoted"
echo "  Voted accounts: $total_voted"
echo ""
echo "📝 Verify with:"
echo "  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_unvoted;'"
echo "  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_voted;'"
echo ""
