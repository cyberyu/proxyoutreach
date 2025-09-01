#!/bin/bash

# Redump proxy_sds database using exact schema from generate_optimized_dumps.sh
# This recreates the proxy_sds_complete_dump.sql with proper encoding and structure

set -e

echo "🔄 Redumping proxy_sds database with reference-compatible format..."

# Configuration
DB_HOST="localhost"
DB_USER="root"
DB_PASSWORD="Dodoba1972"
DATABASE="proxy_sds"
DUMP_DIR="docker"
OUTPUT_FILE="$DUMP_DIR/proxy_sds_complete_dump.sql"

# Ensure dump directory exists
mkdir -p "$DUMP_DIR"

# Backup existing file if it exists
if [ -f "$OUTPUT_FILE" ]; then
    BACKUP_FILE="$OUTPUT_FILE.backup_$(date +%Y%m%d_%H%M%S)"
    echo "💾 Backing up existing dump to: $BACKUP_FILE"
    cp "$OUTPUT_FILE" "$BACKUP_FILE"
fi

echo "📊 Dumping $DATABASE to $OUTPUT_FILE (reference-compatible format)..."
echo "⏰ Started at: $(date)"

# Function to generate reference-compatible dump (exact copy from generate_optimized_dumps.sh)
generate_dump() {
    local database=$1
    local output_file=$2
    
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
}

# Check if database exists
echo "🔍 Checking if database '$DATABASE' exists..."
if ! mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DATABASE;" 2>/dev/null; then
    echo "❌ Database '$DATABASE' does not exist or is not accessible"
    echo "💡 Available databases:"
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SHOW DATABASES;" 2>/dev/null | grep -E "proxy"
    exit 1
fi
echo "✅ Database '$DATABASE' found"

# Generate the dump
generate_dump "$DATABASE" "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ $DATABASE dump completed successfully!"
    echo "💾 File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo "📋 Line count: $(wc -l < "$OUTPUT_FILE")"
    echo "⏰ Completed at: $(date)"
    echo "🚀 Reference-compatible format applied (no secondary indexes for fast import)"
    echo ""
    
    # Verify the dump
    echo "🔍 Verifying dump integrity..."
    echo "   First 5 lines:"
    head -5 "$OUTPUT_FILE"
    echo "   ..."
    echo "   Last 5 lines:"
    tail -5 "$OUTPUT_FILE"
    echo ""
    
    # Check for encoding issues
    echo "🔍 Checking for encoding issues..."
    ENCODING_ISSUES=$(grep -P '[^\x00-\x7F]' "$OUTPUT_FILE" | wc -l)
    if [ "$ENCODING_ISSUES" -gt 0 ]; then
        echo "⚠️  Found $ENCODING_ISSUES lines with non-ASCII characters"
        echo "   This is normal for data containing non-English text"
    else
        echo "✅ Clean ASCII-only dump generated"
    fi
    
    echo ""
    echo "🎉 Fresh proxy_sds dump generated successfully!"
    echo "📂 Output file: $OUTPUT_FILE"
    echo "💡 Ready for import testing or Docker build"
    
else
    echo "❌ Failed to dump $DATABASE"
    exit 1
fi
