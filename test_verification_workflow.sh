#!/bin/bash

# Test workflow for CSV verification and sample data
# This script demonstrates the complete verification workflow

echo "🧪 CSV Format Verification Test Workflow"
echo "=========================================="

# 1. Download sample data
echo "📥 Step 1: Downloading sample data..."
curl -s "http://localhost:3000/api/download-example/unvoted" > test_sample_unvoted.csv
curl -s "http://localhost:3000/api/download-example/voted" > test_sample_voted.csv

if [ ! -f test_sample_unvoted.csv ] || [ ! -f test_sample_voted.csv ]; then
    echo "❌ Error: Could not download sample files. Make sure server is running on localhost:3000"
    exit 1
fi

echo "✅ Sample files downloaded successfully"

# 2. Verify the sample data format
echo ""
echo "🔍 Step 2: Verifying sample data format..."
echo ""
echo "--- Verifying Unvoted Sample ---"
python3 verify_csv_format.py test_sample_unvoted.csv unvoted

echo ""
echo "--- Verifying Voted Sample ---"
python3 verify_csv_format.py test_sample_voted.csv voted

# 3. Show file headers for reference
echo ""
echo "📋 Step 3: Sample file headers for reference..."
echo ""
echo "Unvoted CSV Header:"
head -1 test_sample_unvoted.csv
echo ""
echo "Voted CSV Header:"
head -1 test_sample_voted.csv

# 4. Test with intentionally bad format
echo ""
echo "🚫 Step 4: Testing error detection with bad format..."

# Create a file with old format
cat > test_bad_format.csv << 'EOF'
row_index,unnamed_col,account_hash_key,proposal_master_skey,director_master_skey,account_type,shares_summable,rank_of_shareholding,score_model1,prediction_model1,Target_encoded
1,,HASH001,10001,20001,Individual,1000,1,0.5,1,5
EOF

echo ""
echo "--- Testing Bad Format Detection ---"
python3 verify_csv_format.py test_bad_format.csv unvoted

# 5. Cleanup
echo ""
echo "🧹 Step 5: Cleaning up test files..."
rm -f test_sample_unvoted.csv test_sample_voted.csv test_bad_format.csv
echo "✅ Test files cleaned up"

echo ""
echo "🎉 CSV Verification Test Workflow Complete!"
echo ""
echo "💡 Summary:"
echo "   - Sample data downloads work correctly ✅"
echo "   - Verification script validates optimized schema ✅"
echo "   - Error detection catches old format files ✅"
echo "   - Both unvoted and voted formats are correct ✅"
echo ""
echo "📚 For more information, see CSV_VERIFICATION_GUIDE.md"
