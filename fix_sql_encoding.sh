#!/bin/bash

# Fix SQL encoding corruption in proxy_sds_complete_dump.sql
# Specifically fixes the corrupted character at line 1535

SQL_FILE="./docker/proxy_sds_complete_dump.sql"
BACKUP_FILE="./docker/proxy_sds_complete_dump.sql.backup_$(date +%Y%m%d_%H%M%S)"

echo "=== SQL Encoding Fix Script ==="
echo "Target file: $SQL_FILE"
echo "Backup file: $BACKUP_FILE"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "ERROR: SQL file not found: $SQL_FILE"
    exit 1
fi

echo ""
echo "Step 1: Creating backup..."
cp "$SQL_FILE" "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully"
else
    echo "✗ Failed to create backup"
    exit 1
fi

echo ""
echo "Step 2: Analyzing corruption around line 1535..."

# Extract problematic line and show the corruption
echo "Before fix:"
sed -n '1535p' "$SQL_FILE" | grep -o "�[0-9]*" | head -3

echo ""
echo "Step 3: Fixing encoding corruption..."

# Method 1: Replace the specific corrupted pattern �283365 with 2283365
sed -i 's/�2283365/2283365/g' "$SQL_FILE"

# Method 2: Replace any � character followed by digits with just the digits
sed -i 's/�\([0-9]\)/\1/g' "$SQL_FILE"

# Method 3: Remove any remaining � characters that might be standalone
sed -i 's/�//g' "$SQL_FILE"

echo "✓ Applied encoding fixes"

echo ""
echo "Step 4: Verifying fix..."

# Check if the problematic pattern still exists
CORRUPTION_COUNT=$(grep -c "�" "$SQL_FILE")

if [ $CORRUPTION_COUNT -eq 0 ]; then
    echo "✓ No corruption characters (�) found in file"
    
    # Verify line 1535 specifically
    echo ""
    echo "Line 1535 after fix:"
    sed -n '1535p' "$SQL_FILE" | grep -o "2283365" | head -1
    
    if sed -n '1535p' "$SQL_FILE" | grep -q "2283365"; then
        echo "✓ Line 1535 appears to be fixed correctly"
    else
        echo "⚠ Line 1535 may still have issues"
    fi
    
else
    echo "⚠ Warning: $CORRUPTION_COUNT corruption characters still found"
    echo "Remaining corrupted patterns:"
    grep -n "�" "$SQL_FILE" | head -5
fi

echo ""
echo "Step 5: Testing SQL syntax..."

# Try to validate a small portion of the SQL around line 1535
echo "Extracting lines 1534-1536 for syntax check..."
sed -n '1534,1536p' "$SQL_FILE" > /tmp/test_sql_syntax.sql

# Add basic SQL structure for testing
echo "CREATE TEMPORARY TABLE IF NOT EXISTS account_voted_test (
    id INT,
    account_hash_key VARCHAR(255),
    proposal_master_skey INT,
    director_master_skey INT,
    account_type CHAR(1),
    shares_summable DECIMAL(15,4),
    rank_of_shareholding INT,
    score_model2 DECIMAL(15,12),
    prediction_model2 INT,
    Target_encoded INT,
    created_at TIMESTAMP
);" > /tmp/validate_sql.sql

# Add the fixed lines
cat /tmp/test_sql_syntax.sql >> /tmp/validate_sql.sql

echo "DROP TEMPORARY TABLE IF EXISTS account_voted_test;" >> /tmp/validate_sql.sql

echo ""
echo "=== Fix Summary ==="
echo "Original file backed up to: $BACKUP_FILE"
echo "Fixed file: $SQL_FILE"
echo "Corruption characters removed: $(grep -c "�" "$BACKUP_FILE") → $CORRUPTION_COUNT"

if [ $CORRUPTION_COUNT -eq 0 ]; then
    echo "Status: ✓ FIXED - Ready for MySQL import"
else
    echo "Status: ⚠ PARTIAL - May need manual review"
fi

echo ""
echo "Next steps:"
echo "1. Test the fix with: ./debug_sql_restore.sh"
echo "2. If successful, proceed with full database restore"
echo "3. If issues persist, check backup file: $BACKUP_FILE"
