# Proposals Predictions Bulk Import

This directory contains scripts to import prediction CSV files into multiple MySQL databases.

## Files Created

- `import_proposals_predictions_bulk.py` - Main Python script for bulk import
- `import_proposals_predictions_bulk.sh` - Shell script wrapper with checks
- `verify_proposals_predictions.py` - Verification script to check imported data

## Required CSV Files

Place these CSV files in the `docker/` subdirectory:

- `docker/2025_Nov_to_July_Predictions_OriginalModel_SDS.csv` → `proxy_sds.proposals_predictions`
- `docker/2025_Nov_to_July_Predictions_CalibratedModel_SDS.csv` → `proxy_sds_calibrated.proposals_predictions`
- `docker/2025_Nov_to_July_Predictions_OriginalModel_666.csv` → `proxy_sel.proposals_predictions`
- `docker/2025_Nov_to_July_Predictions_CalibratedModel_666.csv` → `proxy_sel_calibrated.proposals_predictions`

## Usage

### Option 1: Use Shell Script (Recommended)
```bash
./import_proposals_predictions_bulk.sh
```

### Option 2: Use Python Script Directly
```bash
python3 import_proposals_predictions_bulk.py
```

### Verify Import Results
```bash
python3 verify_proposals_predictions.py
```

## What the Script Does

1. **Drops existing `proposals_predictions` tables** in all target databases
2. **Recreates tables** with identical structure to the proxy database
3. **Imports CSV data** while ignoring merge_* columns
4. **Provides detailed progress** and error reporting
5. **Uses batch processing** for efficient imports

## Prerequisites

- Python 3.x
- mysql-connector-python: `pip install mysql-connector-python`
- MySQL database access with credentials in the script

## Database Structure

The script creates `proposals_predictions` tables with this structure:

```sql
CREATE TABLE proposals_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_master_skey INT,
    director_master_skey INT,
    issuer_name VARCHAR(500),
    category VARCHAR(500),
    proposal TEXT,
    prediction_correct TINYINT(1),
    approved TINYINT(1),
    for_percentage DECIMAL(10,6),
    against_percentage DECIMAL(10,6),
    abstain_percentage DECIMAL(10,6),
    predicted_for_shares DECIMAL(20,4),
    predicted_against_shares DECIMAL(20,4),
    predicted_abstain_shares DECIMAL(20,4),
    predicted_unvoted_shares DECIMAL(20,4),
    total_for_shares DECIMAL(20,4),
    total_against_shares DECIMAL(20,4),
    total_abstain_shares DECIMAL(20,4),
    total_unvoted_shares DECIMAL(20,4),
    meeting_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proposal_master_skey (proposal_master_skey),
    INDEX idx_director_master_skey (director_master_skey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## Error Handling

- **Missing CSV files**: Script continues with available files
- **Database connection errors**: Detailed error messages provided
- **Data parsing errors**: Individual row errors logged, import continues
- **Batch processing**: Commits data in batches for reliability

## Safety Features

- **Confirmation prompt** before dropping tables
- **File existence checks** before starting
- **Dependency verification** for Python packages
- **Detailed logging** of all operations
- **Error counting** with automatic stop on excessive errors

## Troubleshooting

1. **Permission errors**: Ensure MySQL user has CREATE, DROP, INSERT privileges
2. **File not found**: Check CSV files are in the correct directory
3. **Connection errors**: Verify MySQL credentials in the Python script
4. **Import errors**: Check CSV format matches expected columns

## Post-Import Verification

After import, verify the data:

```sql
-- Check row counts
SELECT COUNT(*) FROM proxy_sds.proposals_predictions;
SELECT COUNT(*) FROM proxy_sds_calibrated.proposals_predictions;
SELECT COUNT(*) FROM proxy_sel.proposals_predictions;
SELECT COUNT(*) FROM proxy_sel_calibrated.proposals_predictions;

-- Check data quality
SELECT issuer_name, COUNT(*) as proposals 
FROM proxy_sds.proposals_predictions 
GROUP BY issuer_name 
ORDER BY proposals DESC 
LIMIT 10;
```
