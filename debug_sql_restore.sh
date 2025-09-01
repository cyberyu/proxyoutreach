#!/bin/bash
# debug_sql_restore.sh - Debug script to restore SQL dump with encoding fixes
# This script creates a temporary database to test SQL dump restoration

set -e

echo "🔍 SQL Dump Debug Restoration Script"
echo "===================================="

# Configuration
DUMP_FILE="${1:-proxy_sds_complete_dump.sql}"
TEMP_DB="proxy_debug_$(date +%s)"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-Dodoba1972}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-Dodoba1972}"
LOG_FILE="/tmp/debug_restore_$(date +%s).log"

echo "📋 Configuration:"
echo "   Dump file: $DUMP_FILE"
echo "   Temp database: $TEMP_DB"
echo "   Log file: $LOG_FILE"
echo ""

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Dump file not found: $DUMP_FILE"
    echo "💡 Usage: $0 [path_to_dump_file]"
    exit 1
fi

echo "📊 Dump file analysis:"
echo "   Size: $(du -h "$DUMP_FILE" | cut -f1)"
echo "   Lines: $(wc -l < "$DUMP_FILE")"
echo "   File type: $(file "$DUMP_FILE")"
echo ""

# Check for encoding issues
echo "🔍 Checking for encoding issues..."
ENCODING_ISSUES=$(grep -P '[^\x00-\x7F]' "$DUMP_FILE" | wc -l)
if [ "$ENCODING_ISSUES" -gt 0 ]; then
    echo "⚠️  Found $ENCODING_ISSUES lines with non-ASCII characters"
    echo "   First few problematic lines:"
    grep -P '[^\x00-\x7F]' "$DUMP_FILE" | head -5 | nl
else
    echo "✅ No obvious encoding issues found"
fi
echo ""

# Check if MySQL is running
echo "🔍 Checking MySQL status..."
if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo "❌ MySQL is not running or not accessible"
    echo "💡 Please start MySQL first"
    exit 1
fi
echo "✅ MySQL is running"
echo ""

# Create temporary database
echo "🔧 Creating temporary database: $TEMP_DB"
mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "
    CREATE DATABASE IF NOT EXISTS \`$TEMP_DB\`;
    GRANT ALL PRIVILEGES ON \`$TEMP_DB\`.* TO '${MYSQL_USER}'@'localhost';
    GRANT ALL PRIVILEGES ON \`$TEMP_DB\`.* TO '${MYSQL_USER}'@'%';
    FLUSH PRIVILEGES;
" 2>/dev/null || {
    echo "❌ Failed to create temporary database"
    exit 1
}
echo "✅ Temporary database created"
echo ""

# Function to attempt restore with different methods
restore_attempt() {
    local method=$1
    local file=$2
    local extra_params=$3
    
    echo "🔄 Attempting restore with method: $method"
    echo "   File: $file"
    echo "   Extra params: $extra_params"
    
    start_time=$(date +%s)
    
    if mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} \
        --default-character-set=utf8mb4 \
        --force \
        --show-warnings \
        $extra_params \
        "$TEMP_DB" < "$file" 2>&1 | tee -a "$LOG_FILE"; then
        
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        # Check what was imported
        table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "SHOW TABLES;" 2>/dev/null | wc -l)
        
        echo "✅ Method '$method' succeeded!"
        echo "   Duration: ${duration} seconds"
        echo "   Tables created: $((table_count-1))"
        
        # Show table sizes
        if [ "$table_count" -gt 1 ]; then
            echo "📊 Table summary:"
            mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "
                SELECT 
                    TABLE_NAME,
                    TABLE_ROWS,
                    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size_MB'
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = '$TEMP_DB'
                ORDER BY TABLE_ROWS DESC;
            " 2>/dev/null || echo "   Could not get table details"
        fi
        
        return 0
    else
        echo "❌ Method '$method' failed"
        echo "📋 Last 10 lines of error output:"
        tail -10 "$LOG_FILE"
        return 1
    fi
}

# Method 1: Direct import with UTF-8
echo "🚀 Starting restoration attempts..."
echo "================================="
echo ""

if restore_attempt "Direct UTF-8" "$DUMP_FILE" "--verbose"; then
    echo "🎉 Direct import succeeded!"
else
    echo "🔧 Direct import failed, trying cleanup methods..."
    echo ""
    
    # Method 2: Clean with iconv
    echo "🧹 Method 2: Cleaning with iconv..."
    CLEANED_FILE="/tmp/cleaned_$(basename "$DUMP_FILE")"
    
    if iconv -f utf8 -t utf8 -c "$DUMP_FILE" > "$CLEANED_FILE" 2>/dev/null; then
        echo "✅ iconv cleaning completed"
        if restore_attempt "iconv-cleaned" "$CLEANED_FILE" ""; then
            echo "🎉 iconv-cleaned import succeeded!"
        else
            echo "❌ iconv-cleaned import failed"
        fi
    else
        echo "❌ iconv cleaning failed"
    fi
    echo ""
    
    # Method 3: Clean with sed (remove non-printable characters)
    echo "🧹 Method 3: Cleaning with sed..."
    SED_CLEANED_FILE="/tmp/sed_cleaned_$(basename "$DUMP_FILE")"
    
    if sed 's/[^\x00-\x7F]//g' "$DUMP_FILE" > "$SED_CLEANED_FILE"; then
        echo "✅ sed cleaning completed"
        if restore_attempt "sed-cleaned" "$SED_CLEANED_FILE" ""; then
            echo "🎉 sed-cleaned import succeeded!"
        else
            echo "❌ sed-cleaned import failed"
        fi
    else
        echo "❌ sed cleaning failed"
    fi
    echo ""
    
    # Method 4: Try with different MySQL parameters
    echo "🧹 Method 4: Different MySQL parameters..."
    if restore_attempt "relaxed-mode" "$DUMP_FILE" "--sql-mode='' --max_allowed_packet=1G"; then
        echo "🎉 Relaxed mode import succeeded!"
    else
        echo "❌ Relaxed mode import failed"
    fi
    echo ""
    
    # Method 5: Skip problematic lines
    echo "🧹 Method 5: Skipping problematic lines..."
    FILTERED_FILE="/tmp/filtered_$(basename "$DUMP_FILE")"
    
    # Remove lines with problematic characters around line 1535
    sed -n '1,1530p; 1540,$p' "$DUMP_FILE" > "$FILTERED_FILE"
    echo "✅ Created filtered file (skipped lines 1531-1539)"
    
    if restore_attempt "filtered" "$FILTERED_FILE" ""; then
        echo "🎉 Filtered import succeeded!"
    else
        echo "❌ Filtered import failed"
    fi
fi

echo ""
echo "🔍 Final Analysis"
echo "================"

# Check final state
table_count=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$table_count" -gt 1 ]; then
    echo "✅ Successfully imported $((table_count-1)) tables into temporary database"
    echo ""
    echo "📊 Detailed table information:"
    mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "
        SELECT 
            TABLE_NAME,
            TABLE_ROWS,
            ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size_MB',
            TABLE_COLLATION
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '$TEMP_DB'
        ORDER BY TABLE_ROWS DESC;
    " 2>/dev/null
    
    echo ""
    echo "🔍 Sample data from largest table:"
    LARGEST_TABLE=$(mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '$TEMP_DB' AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_ROWS DESC LIMIT 1;
    " 2>/dev/null | tail -1)
    
    if [ -n "$LARGEST_TABLE" ]; then
        echo "   Table: $LARGEST_TABLE"
        mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -D "$TEMP_DB" -e "SELECT * FROM \`$LARGEST_TABLE\` LIMIT 3;" 2>/dev/null || echo "   Could not sample data"
    fi
else
    echo "❌ No tables were successfully imported"
    echo "📋 Full error log saved to: $LOG_FILE"
fi

echo ""
echo "🧹 Cleanup Options:"
echo "   Keep temp database: mysql -u $MYSQL_USER -p$MYSQL_PASSWORD -D $TEMP_DB"
echo "   Drop temp database: mysql -u root -p$MYSQL_ROOT_PASSWORD -e 'DROP DATABASE \`$TEMP_DB\`;'"
echo "   View full log: cat $LOG_FILE"

# Clean up temporary files
rm -f "$CLEANED_FILE" "$SED_CLEANED_FILE" "$FILTERED_FILE" 2>/dev/null

echo ""
echo "✅ Debug restoration complete!"
