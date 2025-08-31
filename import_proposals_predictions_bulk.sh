#!/bin/bash

# Bulk Proposals Predictions Import Script
# Imports 4 CSV files into their respective database proposals_predictions tables

echo "🚀 Bulk Proposals Predictions Import"
echo "=================================="
echo ""

# Check if Python script exists
if [ ! -f "import_proposals_predictions_bulk.py" ]; then
    echo "❌ Error: import_proposals_predictions_bulk.py not found"
    echo "   Please ensure the Python script is in the current directory"
    exit 1
fi

# Check if required CSV files exist
echo "📋 Checking for required CSV files..."
missing_files=0

files=(
    "docker/2025_Nov_to_July_Predictions_OriginalModel_SDS.csv"
    "docker/2025_Nov_to_July_Predictions_CalibratedModel_SDS.csv"
    "docker/2025_Nov_to_July_Predictions_OriginalModel_666.csv"
    "docker/2025_Nov_to_July_Predictions_CalibratedModel_666.csv"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ Found: $file"
    else
        echo "   ❌ Missing: $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "⚠️ Warning: $missing_files CSV file(s) missing"
    echo "   The script will skip missing files and continue with available ones"
    echo ""
fi

# Check Python dependencies
echo ""
echo "🔍 Checking Python environment..."
if ! python3 -c "import mysql.connector" 2>/dev/null; then
    echo "❌ Error: mysql-connector-python not installed"
    echo "   Please install it with: pip install mysql-connector-python"
    exit 1
else
    echo "   ✅ mysql-connector-python is available"
fi

# Ask for confirmation
echo ""
echo "⚠️  WARNING: This script will DROP existing proposals_predictions tables"
echo "   in the following databases:"
echo "   - proxy_sds"
echo "   - proxy_sds_calibrated" 
echo "   - proxy_sel"
echo "   - proxy_sel_calibrated"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled by user"
    exit 0
fi

# Run the Python import script
echo ""
echo "🚀 Starting bulk import process..."
echo ""

python3 import_proposals_predictions_bulk.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Bulk import completed successfully!"
    echo ""
    echo "📊 You can now verify the data by connecting to MySQL and running:"
    echo "   SELECT COUNT(*) FROM proxy_sds.proposals_predictions;"
    echo "   SELECT COUNT(*) FROM proxy_sds_calibrated.proposals_predictions;"
    echo "   SELECT COUNT(*) FROM proxy_sel.proposals_predictions;"
    echo "   SELECT COUNT(*) FROM proxy_sel_calibrated.proposals_predictions;"
else
    echo ""
    echo "❌ Bulk import completed with errors"
    echo "   Please check the output above for details"
    exit 1
fi
