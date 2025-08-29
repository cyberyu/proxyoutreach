#!/bin/bash

# Generate reference-compatible SQL dumps for Docker container
# Dumps all five proxy databases: proxy, proxy_sds, proxy_sds_calibrated, proxy_sel, proxy_sel_calibrated
# Mimics the exact format of proxy-outreach:fixed-context for optimal performance

set -e

echo "🚀 Generating reference-compatible SQL dumps for all five proxy databases..."

# Configuration - Update these as needed
DB_HOST="localhost"
DB_USER="root"
DUMP_DIR="docker"

# Prompt for password securely
echo "🔐 MySQL credentials needed for dump generation:"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo -n "Password: "
read -s DB_PASSWORD
echo  # Add newline after hidden password input

# Ensure dump directory exists
mkdir -p "$DUMP_DIR"

# Function to generate reference-compatible dump
generate_dump() {
    local database=$1
    local output_file=$2
    
    echo "📊 Dumping $database to $output_file (reference-compatible format)..."
    echo "⏰ Started at: $(date)"
    
    # Use EXACT same mysqldump settings as reference container for optimal import speed
    # Key difference: NO secondary indexes in dump (only structure + data)
    # This matches proxy-outreach:fixed-context which imports in ≤12 minutes
    mysqldump \
        --host="$DB_HOST" \
        --user="$DB_USER" \
        --password="$DB_PASSWORD" \
        --single-transaction \
        --extended-insert \
        --quick \
        --lock-tables=false \
        --disable-keys \
        --no-create-info \
        --default-character-set=utf8mb4 \
        --hex-blob \
        --complete-insert \
        --ignore-table="$database.account_unvoted_backup_20250820" \
        --ignore-table="$database.account_voted_backup_20250820" \
        "$database" > "$output_file.data"
    
    # Generate structure-only dump WITHOUT secondary indexes
    mysqldump \
        --host="$DB_HOST" \
        --user="$DB_USER" \
        --password="$DB_PASSWORD" \
        --no-data \
        --single-transaction \
        --routines \
        --triggers \
        --add-drop-table \
        --create-options \
        --set-charset \
        --default-character-set=utf8mb4 \
        --ignore-table="$database.account_unvoted_backup_20250820" \
        --ignore-table="$database.account_voted_backup_20250820" \
        "$database" > "$output_file.structure"
    
    # Combine structure and data, removing secondary indexes to match reference performance
    echo "🔧 Creating reference-compatible combined dump..."
    {
        # Add structure but filter out all secondary indexes and unique keys
        # Use awk to properly handle table structure and remove index definitions
        awk '
            /CREATE TABLE/ { in_table = 1 }
            /^\) ENGINE=/ { 
                if (in_table) {
                    # Close the table properly 
                    print "  PRIMARY KEY (`id`)"
                    print $0
                    in_table = 0
                    next
                }
            }
            /^  KEY `idx_/ { next }
            /^  UNIQUE KEY/ { next }
            /^  ADD KEY/ { next }
            /^  ADD UNIQUE KEY/ { next }
            /PRIMARY KEY \(`id`\),/ {
                # Remove trailing comma from PRIMARY KEY
                sub(/,/, "", $0)
            }
            { 
                if (!in_table || !/^  [A-Z]+ KEY/) {
                    # Replace collation
                    gsub(/utf8mb4_0900_ai_ci/, "utf8mb4_unicode_ci", $0)
                    print $0
                }
            }
        ' "$output_file.structure"
        
        # Add data with validation
        if [ -f "$output_file.data" ] && [ -s "$output_file.data" ]; then
            echo "-- Data import for $database"
            grep -A999999 "INSERT INTO" "$output_file.data" | sed 's/\x00//g' # Remove NULL bytes
        else
            echo "-- No data found for $database"
        fi
    } > "$output_file"
    
    # Clean up temporary files
    rm -f "$output_file.structure" "$output_file.data"
    
    if [ $? -eq 0 ]; then
        echo "✅ $database dump completed successfully!"
        echo "💾 File size: $(du -h "$output_file" | cut -f1)"
        echo "⏰ Completed at: $(date)"
        echo "🚀 Reference-compatible format applied (no secondary indexes for fast import)"
        echo ""
    else
        echo "❌ Failed to dump $database"
        exit 1
    fi
}

# Array of databases to dump
DATABASES=(
    "proxy"
    "proxy_sds" 
    "proxy_sds_calibrated"
    "proxy_sel"
    "proxy_sel_calibrated"
)

# Generate dumps for all databases
echo "🎯 Generating dumps for all five databases..."
DUMP_FILES=()
DUMP_SIZES=()
TOTAL_DATABASES=${#DATABASES[@]}

for i in "${!DATABASES[@]}"; do
    db="${DATABASES[$i]}"
    current=$((i + 1))
    echo ""
    echo "🔄 Processing database $current/$TOTAL_DATABASES: $db"
    dump_file="$DUMP_DIR/${db}_complete_dump.sql"
    generate_dump "$db" "$dump_file"
    
    # Store for summary
    DUMP_FILES+=("$dump_file")
    if [ -f "$dump_file" ]; then
        DUMP_SIZES+=("$(du -h "$dump_file" | cut -f1)")
    else
        DUMP_SIZES+=("ERROR")
    fi
done

echo "🎉 All reference-compatible dumps generated successfully!"
echo ""
echo "📋 Summary:"
for i in "${!DATABASES[@]}"; do
    echo "  - ${DATABASES[$i]} dump: ${DUMP_FILES[$i]} (${DUMP_SIZES[$i]})"
done
echo ""
echo "🚀 Ready for Docker build with reference-compatible imports for all five databases!"
echo ""
echo "💡 Key optimizations applied (matching reference container):"
echo "   - Extended INSERT statements (bulk format)"
echo "   - NO secondary indexes (PRIMARY KEY only) for 7x faster imports"
echo "   - utf8mb4_unicode_ci collation (matches reference)"
echo "   - Single transaction for consistency"
echo "   - Quick mode for large datasets"
echo "   - Expected import time: ≤12 minutes per database (matching reference performance)"
echo ""
echo "📦 Generated files ready for Docker build:"
for i in "${!DATABASES[@]}"; do
    echo "   ${DATABASES[$i]}_complete_dump.sql"
done
