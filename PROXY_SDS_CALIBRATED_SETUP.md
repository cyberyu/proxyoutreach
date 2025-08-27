# Proxy SDS Calibrated Database Setup Guide

## Overview

This guide provides comprehensive instructions for setting up and managing the `proxy_sds_calibrated` database, which contains SDS (Shareholder Decision Support) calibrated model predictions for proxy voting analysis.

## 🎯 Purpose

The `proxy_sds_calibrated` database extends the standard proxy analysis with enhanced SDS calibrated model predictions, providing:

- **Enhanced Accuracy**: SDS calibrated predictions improve model performance
- **Advanced Analytics**: Better insights for proxy outreach campaigns  
- **Optimized Performance**: Enhanced indexing for calibrated model fields
- **Comprehensive Coverage**: Both voted and unvoted account analysis

## 📊 Database Structure

### Database: `proxy_sds_calibrated`

#### Tables:
1. **account_unvoted** - SDS calibrated data for accounts that haven't voted
2. **account_voted** - SDS calibrated data for accounts that have voted

#### Schema:
```sql
CREATE TABLE account_unvoted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_hash_key VARCHAR(255) NOT NULL,
    proposal_master_skey INT,
    director_master_skey INT,
    account_type VARCHAR(50),
    shares_summable BIGINT,
    rank_of_shareholding INT,
    score_model2 DECIMAL(10,6),        -- SDS calibrated score
    prediction_model2 DECIMAL(10,6),   -- SDS calibrated prediction
    Target_encoded INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Enhanced indexing for SDS calibrated data
    INDEX idx_account_hash (account_hash_key),
    INDEX idx_proposal_skey (proposal_master_skey),
    INDEX idx_director_skey (director_master_skey),
    INDEX idx_account_type (account_type),
    INDEX idx_rank (rank_of_shareholding),
    INDEX idx_score_model2 (score_model2),      -- NEW: SDS score index
    INDEX idx_prediction_model2 (prediction_model2)  -- NEW: SDS prediction index
);
```

## 🚀 Quick Setup

### Option 1: Complete Automated Setup
```bash
# Run the complete setup script
./setup_proxy_sds_calibrated_complete.sh
```

This single command will:
- ✅ Check all dependencies
- ✅ Verify SDS calibrated parquet files exist
- ✅ Create the database and tables
- ✅ Import all SDS calibrated data
- ✅ Verify the setup and display statistics

### Option 2: Step-by-Step Setup

#### Step 1: Create Database
```bash
./setup_proxy_sds_calibrated_database.sh
```

#### Step 2: Import SDS Calibrated Data
```bash
python3 import_proxy_sds_calibrated_unified.py
```

## 📁 Data Files

The setup expects these SDS calibrated parquet files in the `./backups/` directory:

1. **df_calibrated_SDS_account_unvoted_sorted.parquet** (~563MB)
   - Contains SDS calibrated data for unvoted accounts
   
2. **df_calibrated_SDS_account_voted_sorted.parquet** (~192MB)
   - Contains SDS calibrated data for voted accounts

### Custom File Paths
You can specify custom file paths:
```bash
python3 import_proxy_sds_calibrated_unified.py /path/to/unvoted.parquet /path/to/voted.parquet
```

## 🔧 Configuration

### Database Connection
- **Host**: localhost
- **Database**: proxy_sds_calibrated
- **User**: webapp
- **Password**: webapppass

### Alternative Root Access
If webapp user fails, the scripts will prompt for root password.

## 📈 SDS Calibrated Features

### Enhanced Model Performance
- **Calibrated Scores**: `score_model2` provides improved accuracy over base models
- **Calibrated Predictions**: `prediction_model2` offers better proxy voting predictions
- **Statistical Analysis**: Built-in statistics for model performance evaluation

### Optimized Indexing
- Standard indexes for account identification and categorization
- **NEW**: Dedicated indexes for `score_model2` and `prediction_model2`
- Enhanced query performance for calibrated model analysis

### Advanced Analytics Support
- Account type distribution analysis
- Shareholding rank correlation studies
- Calibrated prediction confidence intervals
- Model performance comparison capabilities

## 📊 Usage Examples

### Basic Data Queries

#### Get SDS Calibrated Statistics
```sql
USE proxy_sds_calibrated;

-- Account distribution
SELECT account_type, COUNT(*) as count, 
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM account_unvoted), 2) as percentage
FROM account_unvoted 
GROUP BY account_type 
ORDER BY count DESC;

-- SDS Calibrated model performance
SELECT 
    AVG(score_model2) as avg_score,
    MIN(score_model2) as min_score,
    MAX(score_model2) as max_score,
    STD(score_model2) as std_score
FROM account_unvoted 
WHERE score_model2 IS NOT NULL;
```

#### High-Confidence SDS Predictions
```sql
-- Find accounts with high SDS calibrated prediction confidence
SELECT account_hash_key, account_type, shares_summable, 
       score_model2, prediction_model2
FROM account_unvoted 
WHERE prediction_model2 > 0.8
ORDER BY prediction_model2 DESC, shares_summable DESC
LIMIT 100;
```

#### SDS Model Comparison Analysis
```sql
-- Compare prediction ranges between voted and unvoted
SELECT 
    'unvoted' as account_status,
    AVG(prediction_model2) as avg_prediction,
    STD(prediction_model2) as std_prediction,
    COUNT(*) as total_accounts
FROM account_unvoted
WHERE prediction_model2 IS NOT NULL

UNION ALL

SELECT 
    'voted' as account_status,
    AVG(prediction_model2) as avg_prediction,
    STD(prediction_model2) as std_prediction,
    COUNT(*) as total_accounts
FROM account_voted
WHERE prediction_model2 IS NOT NULL;
```

### Python Integration

#### Connect to SDS Calibrated Database
```python
import mysql.connector
import pandas as pd

# Connect to database
connection = mysql.connector.connect(
    host='localhost',
    user='webapp',
    password='webapppass',
    database='proxy_sds_calibrated'
)

# Query SDS calibrated data
query = """
SELECT account_hash_key, account_type, shares_summable, 
       score_model2, prediction_model2
FROM account_unvoted 
WHERE prediction_model2 > 0.7
ORDER BY prediction_model2 DESC
LIMIT 1000
"""

df = pd.read_sql(query, connection)
print(f"High-confidence SDS predictions: {len(df)} accounts")
```

## 🔍 Verification and Monitoring

### Check Import Status
```bash
mysql -u webapp -pwebapppass -e "
USE proxy_sds_calibrated;
SELECT 'account_unvoted' as table_name, COUNT(*) as record_count FROM account_unvoted
UNION ALL
SELECT 'account_voted' as table_name, COUNT(*) as record_count FROM account_voted;
"
```

### Monitor SDS Performance
```sql
-- Check SDS calibrated model coverage
SELECT 
    COUNT(*) as total_records,
    COUNT(score_model2) as records_with_score,
    COUNT(prediction_model2) as records_with_prediction,
    ROUND(COUNT(score_model2) * 100.0 / COUNT(*), 2) as score_coverage_pct,
    ROUND(COUNT(prediction_model2) * 100.0 / COUNT(*), 2) as prediction_coverage_pct
FROM account_unvoted;
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. File Not Found
```
❌ SDS calibrated unvoted file not found
```
**Solution**: Ensure parquet files are in `./backups/` directory with correct names.

#### 2. Connection Failed
```
❌ Failed to connect as webapp
```
**Solution**: Script will prompt for root password as fallback.

#### 3. Memory Issues
```
❌ Error importing: Memory error
```
**Solution**: The import uses 1000-record batches to handle large files efficiently.

#### 4. Data Type Errors
```
❌ Error: Invalid data type
```
**Solution**: Script automatically handles float64→int conversion and NaN values.

### Performance Optimization

#### Index Usage Verification
```sql
-- Check if indexes are being used
EXPLAIN SELECT * FROM account_unvoted 
WHERE score_model2 > 0.5 AND account_type = 'I';
```

#### Query Performance Tuning
```sql
-- Optimize for large result sets
SELECT SQL_NO_CACHE account_hash_key, prediction_model2 
FROM account_unvoted 
WHERE prediction_model2 BETWEEN 0.6 AND 0.9
ORDER BY prediction_model2 DESC;
```

## 🔬 Advanced Features

### SDS Model Analysis
The database includes built-in functions for:
- **Calibration Quality Assessment**: Statistical measures of model calibration
- **Prediction Confidence Intervals**: Uncertainty quantification for predictions
- **Cross-Account Analysis**: Comparative studies between voted/unvoted segments
- **Performance Benchmarking**: Model accuracy evaluation tools

### Integration with Analytics Tools
- **Jupyter Notebooks**: Direct pandas integration for data science workflows
- **BI Tools**: Standard MySQL connectivity for business intelligence platforms
- **R/Python**: Full statistical analysis support through database connectors
- **Custom Applications**: RESTful API development support

## 📚 Related Documentation

- `PROXY_SEL_SETUP.md` - Original proxy_sel database setup
- `PROXY_SEL_CALIBRATED_SETUP.md` - Standard calibrated model setup
- `DATABASE_OPTIMIZATION.md` - Performance tuning guides
- `README.md` - Project overview and general information

## 🎉 Success Verification

After successful setup, you should see:
```
🎉 SDS CALIBRATED SETUP COMPLETED SUCCESSFULLY!
===============================================

✅ Database: proxy_sds_calibrated
✅ Tables: account_unvoted, account_voted  
✅ Data: Imported from SDS calibrated parquet files
✅ User: webapp (password: webapppass)
✅ Enhanced: SDS calibrated model predictions

🔬 SDS Calibrated Features:
   - Enhanced model predictions for proxy voting analysis
   - Optimized indexing for score_model2 and prediction_model2
   - Comprehensive account type and shareholding analysis
   - Ready for advanced proxy outreach analytics
```

This indicates that your SDS calibrated database is ready for advanced proxy voting analysis and outreach campaigns.

---

**Version**: 1.0  
**Created**: August 25, 2025  
**Database**: proxy_sds_calibrated  
**Purpose**: SDS Calibrated Proxy Voting Analysis
