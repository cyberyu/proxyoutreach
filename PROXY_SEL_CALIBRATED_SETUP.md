# proxy_sel_calibrated Database Setup Guide

This guide explains how to create the `proxy_sel_calibrated` database and import the two calibrated parquet files for Account tables with optimized model predictions.

## 📁 Files Created

### Database Setup
- `setup_proxy_sel_calibrated_database.sh` - Creates the proxy_sel_calibrated database and Account tables
- `setup_proxy_sel_calibrated_complete.sh` - Complete automated setup script

### Data Import Scripts  
- `import_proxy_sel_calibrated_unified.py` - Unified script to import both calibrated parquet files

## 🧪 Calibrated Data Overview

The `proxy_sel_calibrated` database contains **calibrated model predictions** that have been optimized for accuracy through calibration techniques. This provides more reliable probability estimates compared to raw model outputs.

### Key Features:
- **Calibrated Predictions**: Model outputs adjusted for better probability estimation
- **Enhanced Accuracy**: Improved reliability for decision-making
- **Same Schema**: Compatible with existing proxy_sel structure
- **Optimized Performance**: Calibrated models typically show better real-world performance

## 🚀 Quick Start (Automated)

Run the complete setup script:

```bash
./setup_proxy_sel_calibrated_complete.sh
```

This will:
1. Check dependencies (MySQL, Python, required packages)
2. Verify calibrated parquet files exist
3. Create the proxy_sel_calibrated database and tables
4. Import both calibrated parquet files using the unified import script
5. Verify the import results with calibration statistics

## 📋 Manual Setup (Step by Step)

### Step 1: Create Database

```bash
./setup_proxy_sel_calibrated_database.sh
```

### Step 2: Import Calibrated Data (Unified Method - Recommended)

```bash
python3 import_proxy_sel_calibrated_unified.py
```

### Alternative: Custom File Paths

```bash
python3 import_proxy_sel_calibrated_unified.py /path/to/unvoted.parquet /path/to/voted.parquet
```

## 🗄️ Database Schema

### Database: `proxy_sel_calibrated`

#### Table: `account_unvoted`
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `account_hash_key` (VARCHAR(255), NOT NULL, INDEXED)
- `proposal_master_skey` (INT, INDEXED)
- `director_master_skey` (INT, INDEXED)
- `account_type` (VARCHAR(50), INDEXED)
- `shares_summable` (BIGINT)
- `rank_of_shareholding` (INT, INDEXED)
- `score_model2` (DECIMAL(10,6)) - **Calibrated Score**
- `prediction_model2` (DECIMAL(10,6)) - **Calibrated Probability**
- `Target_encoded` (INT)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

#### Table: `account_voted`
- Same schema as account_unvoted

## 📊 Data Sources

- **Account_unvoted**: `./backups/df_calibrated_sel_666_account_unvoted_sorted.parquet`
- **Account_voted**: `./backups/df_calibrated_sel_666_account_voted_sorted.parquet`

## 🔐 Database Access

### Connection Details
- **Host**: localhost
- **Database**: proxy_sel_calibrated
- **User**: webapp
- **Password**: webapppass

### MySQL Command Line
```bash
mysql -u webapp -pwebapppass proxy_sel_calibrated
```

## 🛠️ Requirements

### System Requirements
- MySQL Server (running)
- Python 3.x
- MySQL client tools

### Python Packages
- pandas
- mysql-connector-python
- pyarrow

Install with:
```bash
pip3 install pandas mysql-connector-python pyarrow
```

## 🔍 Verification Queries

### Check Record Counts
```sql
USE proxy_sel_calibrated;
SELECT COUNT(*) as unvoted_count FROM account_unvoted;
SELECT COUNT(*) as voted_count FROM account_voted;
```

### Sample Calibrated Data
```sql
SELECT account_hash_key, prediction_model2, score_model2 
FROM account_unvoted 
WHERE prediction_model2 IS NOT NULL 
LIMIT 5;

SELECT account_hash_key, prediction_model2, score_model2 
FROM account_voted 
WHERE prediction_model2 IS NOT NULL 
LIMIT 5;
```

### Calibration Statistics
```sql
-- Prediction distribution for unvoted accounts
SELECT 
    AVG(prediction_model2) as avg_prediction,
    MIN(prediction_model2) as min_prediction,
    MAX(prediction_model2) as max_prediction,
    STDDEV(prediction_model2) as std_prediction
FROM account_unvoted 
WHERE prediction_model2 IS NOT NULL;

-- Prediction distribution for voted accounts
SELECT 
    AVG(prediction_model2) as avg_prediction,
    MIN(prediction_model2) as min_prediction,
    MAX(prediction_model2) as max_prediction,
    STDDEV(prediction_model2) as std_prediction
FROM account_voted 
WHERE prediction_model2 IS NOT NULL;
```

### Table Schema
```sql
DESCRIBE account_unvoted;
DESCRIBE account_voted;
```

## 🚨 Troubleshooting

### Common Issues

1. **MySQL Connection Error**: 
   - Ensure MySQL is running
   - Check user credentials
   - Try connecting as root if webapp user fails

2. **Calibrated Parquet File Not Found**:
   - Check file paths in import scripts
   - Verify files exist: `ls -la backups/df_calibrated_sel_666_*`

3. **Python Package Missing**:
   - Install required packages: `pip3 install pandas mysql-connector-python pyarrow`

4. **Permission Denied**:
   - Make scripts executable: `chmod +x *.sh`

### File Locations
The setup scripts expect calibrated parquet files at:
- `./backups/df_calibrated_sel_666_account_unvoted_sorted.parquet`
- `./backups/df_calibrated_sel_666_account_voted_sorted.parquet`

If your files are elsewhere, either:
- Move them to the expected location, or
- Edit the import scripts to use different paths, or
- Pass the file path as a command line argument:
  ```bash
  python3 import_proxy_sel_calibrated_unified.py /path/to/unvoted.parquet /path/to/voted.parquet
  ```

## 🧪 Understanding Calibrated Predictions

### What is Model Calibration?
Calibration adjusts model outputs to provide more accurate probability estimates. A well-calibrated model means:
- If the model predicts 70% probability, about 70% of those cases should actually occur
- Improved reliability for decision-making and risk assessment
- Better alignment between predicted probabilities and actual outcomes

### Benefits of Calibrated Data:
1. **More Accurate Probabilities**: Better alignment with true likelihood
2. **Improved Decision Making**: More reliable for threshold-based decisions
3. **Better Uncertainty Quantification**: More trustworthy confidence estimates
4. **Enhanced Model Performance**: Often leads to better real-world results

### Typical Calibration Statistics:
- **Prediction Range**: Usually [0, 1] for probabilities
- **Distribution**: Often more concentrated around true probabilities
- **Reliability**: Better correlation between predicted and actual outcomes

## 📈 Next Steps

After successful setup, you can:
1. Compare calibrated vs non-calibrated predictions
2. Run analytics queries on the calibrated Account tables
3. Build dashboards using the calibrated data
4. Integrate calibrated predictions into proxy account outreach workflows
5. Perform A/B testing between calibrated and non-calibrated models

## 🔗 Integration

The proxy_sel_calibrated database is designed to be a drop-in replacement for proxy_sel with improved prediction accuracy. The schema is identical, allowing easy integration with existing applications while providing better model performance.

## 📊 Performance Comparison

To compare calibrated vs non-calibrated performance:

```sql
-- Compare prediction distributions
SELECT 'calibrated' as model_type, 
       AVG(prediction_model2) as avg_pred,
       STDDEV(prediction_model2) as std_pred
FROM proxy_sel_calibrated.account_voted
UNION ALL
SELECT 'original' as model_type,
       AVG(prediction_model2) as avg_pred, 
       STDDEV(prediction_model2) as std_pred
FROM proxy_sel.account_voted;
```
