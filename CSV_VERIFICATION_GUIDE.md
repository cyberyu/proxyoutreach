# CSV Format Verification Guide

## Overview
This guide explains how to validate CSV files for the optimized database schema after the removal of redundant `row_index` and `unnamed_col` columns.

## Verification Script
Use the `verify_csv_format.py` script to validate your CSV files before importing them into the database.

### Usage
```bash
# Basic validation
python3 verify_csv_format.py <csv_file> <table_type>

# Verbose output
python3 verify_csv_format.py <csv_file> <table_type> -v

# Example for unvoted accounts
python3 verify_csv_format.py my_unvoted_accounts.csv unvoted

# Example for voted accounts  
python3 verify_csv_format.py my_voted_accounts.csv voted
```

### Table Types
- `unvoted`: For account_unvoted table data
- `voted`: For account_voted table data

## Expected Schema (Optimized)

### Account Unvoted Table
Required columns in exact order:
1. `account_hash_key` (string)
2. `proposal_master_skey` (integer) 
3. `director_master_skey` (integer)
4. `account_type` (string: Individual, Institution, Mutual Fund, Other)
5. `shares_summable` (float)
6. `rank_of_shareholding` (integer)
7. `score_model1` (float)
8. `prediction_model1` (integer: 0 or 1)
9. `Target_encoded` (integer)

### Account Voted Table  
Required columns in exact order:
1. `account_hash_key` (string)
2. `proposal_master_skey` (integer)
3. `director_master_skey` (integer) 
4. `account_type` (string: Individual, Institution, Mutual Fund, Other)
5. `shares_summable` (float)
6. `rank_of_shareholding` (integer)
7. `score_model2` (float)
8. `prediction_model2` (integer: 0 or 1)
9. `Target_encoded` (integer)

## Common Issues and Solutions

### ❌ Old Format Detected
**Problem**: File contains `row_index` and/or `unnamed_col` columns
**Solution**: Use the `preprocess_csv_for_optimization.py` script to remove redundant columns

```bash
python3 preprocess_csv_for_optimization.py input_file.csv output_file.csv unvoted
```

### ❌ Column Count Mismatch
**Problem**: Wrong number of columns in CSV
**Solution**: Ensure your CSV has exactly 9 columns in the correct order

### ❌ Invalid Data Types
**Problem**: Data doesn't match expected types
**Solution**: Check that:
- Numeric fields contain valid numbers
- Account types are valid values
- Hash keys are non-empty strings

### ❌ Missing Required Columns
**Problem**: CSV is missing expected columns
**Solution**: Add missing columns or reformat your data to match the schema

## Sample Data Download

The application provides sample CSV files that demonstrate the correct format:

### From Web Interface
1. Go to Admin panel (login required)
2. Use "Download Sample Data" buttons for unvoted/voted examples
3. These files are always up-to-date with the current schema

### From Server API
```bash
# Download sample unvoted accounts
curl -o example_unvoted.csv "http://localhost:3000/api/download-example/unvoted"

# Download sample voted accounts  
curl -o example_voted.csv "http://localhost:3000/api/download-example/voted"
```

## Verification Workflow

### Before Import
1. **Validate Format**: Run verification script on your CSV
2. **Fix Issues**: Address any errors reported by the script
3. **Re-validate**: Run verification again until it passes
4. **Import**: Use the optimized import scripts

### Example Workflow
```bash
# Step 1: Verify your CSV
python3 verify_csv_format.py my_data.csv unvoted -v

# Step 2: If issues found, preprocess the file
python3 preprocess_csv_for_optimization.py my_data.csv my_data_clean.csv unvoted

# Step 3: Verify the cleaned file
python3 verify_csv_format.py my_data_clean.csv unvoted

# Step 4: Import when validation passes
./import_csv_simple.sh my_data_clean.csv unvoted
```

## Integration with Import Scripts

All import scripts have been updated to work with the optimized schema:

- `import_csv_simple.sh`: Basic CSV import
- `import_csv_update_20250817.py`: Advanced import with progress tracking
- `import_csv.py`: General purpose import script

These scripts will automatically validate the schema before importing and provide helpful error messages if issues are found.

## Troubleshooting

### Script Won't Run
```bash
# Make sure script is executable
chmod +x verify_csv_format.py

# Check Python version (requires Python 3.6+)
python3 --version
```

### Large File Performance
For very large files, use the sample validation option:
```bash
python3 verify_csv_format.py large_file.csv unvoted --sample-only
```

This validates only the first 100 rows for performance while still checking the complete file structure.

### Getting Help
```bash
# Show all available options
python3 verify_csv_format.py -h
```

## Schema Migration Notes

**Important**: This verification system is designed for the optimized database schema implemented on 2025-01-18. If you have CSV files from before this date, they likely contain the redundant `row_index` and `unnamed_col` columns and will need preprocessing.

The migration removed these columns to:
- Reduce storage requirements by ~22%
- Improve query performance  
- Simplify data structure
- Eliminate data redundancy

All existing data was safely migrated, and the verification system ensures new imports maintain the optimized format.
