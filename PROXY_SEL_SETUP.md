# proxy_sel Database Setup Guide

This guide explains how to create the `proxy_sel` database and import the two parquet files for Account tables.

## 📁 Files Created

### Database Setup
- `setup_proxy_sel_database.sh` - Creates the proxy_sel database and Account tables
- `setup_proxy_sel_complete.sh` - Complete automated setup script

### Data Import Scripts  
- `import_proxy_sel_account_unvoted.py` - Imports df_2025_sel_666_account_unvoted_sorted.parquet
- `import_proxy_sel_account_voted.py` - Imports df_2025_sel_666_account_voted_sorted.parquet
- `import_proxy_sel_unified.py` - **NEW**: Unified script to import both parquet files

## 🚀 Quick Start (Automated)

Run the complete setup script:

```bash
./setup_proxy_sel_complete.sh
```

This will:
1. Check dependencies (MySQL, Python, required packages)
2. Verify parquet files exist
3. Create the proxy_sel database and tables
4. Import both parquet files using the unified import script
5. Verify the import results

## ⚡ Unified Import Features

The new `import_proxy_sel_unified.py` script provides:

- **Single Command**: Import both tables with one command
- **Intelligent Column Mapping**: Automatically maps column variations (score_model1 → score_model2, etc.)
- **Robust Error Handling**: Fallback mechanisms and detailed error reporting
- **Progress Tracking**: Real-time progress updates for large datasets
- **Data Validation**: Comprehensive data cleaning and validation
- **Flexible File Paths**: Use default paths or specify custom files

### Usage Examples:

```bash
# Use default file paths
python3 import_proxy_sel_unified.py

# Specify custom file paths
python3 import_proxy_sel_unified.py /path/to/unvoted.parquet /path/to/voted.parquet
```

## 📋 Manual Setup (Step by Step)

### Step 1: Create Database

```bash
./setup_proxy_sel_database.sh
```

### Step 2: Import Both Tables (Unified Method - Recommended)

```bash
python3 import_proxy_sel_unified.py
```

### Alternative: Import Tables Individually

#### Step 2a: Import account_unvoted

```bash
python3 import_proxy_sel_account_unvoted.py
```

#### Step 2b: Import account_voted

```bash
python3 import_proxy_sel_account_voted.py
```

## 🗄️ Database Schema

### Database: `proxy_sel`

#### Table: `account_unvoted`
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `account_hash_key` (VARCHAR(255), NOT NULL, INDEXED)
- `proposal_master_skey` (INT, INDEXED)
- `director_master_skey` (INT, INDEXED)
- `account_type` (VARCHAR(50), INDEXED)
- `shares_summable` (BIGINT)
- `rank_of_shareholding` (INT, INDEXED)
- `score_model2` (DECIMAL(10,6))
- `prediction_model2` (DECIMAL(10,6))
- `Target_encoded` (INT)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

#### Table: `account_voted`
- Same schema as account_unvoted

## 📊 Data Sources

- **Account_unvoted**: `./backups/df_2025_sel_666_account_unvoted_sorted.parquet`
- **Account_voted**: `./backups/df_2025_sel_666_account_voted_sorted.parquet`

## 🔐 Database Access

### Connection Details
- **Host**: localhost
- **Database**: proxy_sel
- **User**: webapp
- **Password**: webapppass

### MySQL Command Line
```bash
mysql -u webapp -pwebapppass proxy_sel
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
USE proxy_sel;
SELECT COUNT(*) as unvoted_count FROM account_unvoted;
SELECT COUNT(*) as voted_count FROM account_voted;
```

### Sample Data
```sql
SELECT * FROM account_unvoted LIMIT 5;
SELECT * FROM account_voted LIMIT 5;
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

2. **Parquet File Not Found**:
   - Check file paths in import scripts
   - Update paths if files are in different locations

3. **Python Package Missing**:
   - Install required packages: `pip3 install pandas mysql-connector-python pyarrow`

4. **Permission Denied**:
   - Make scripts executable: `chmod +x *.sh`

### File Locations
The setup scripts expect parquet files at:
- `./backups/df_2025_sel_666_account_unvoted_sorted.parquet`
- `./backups/df_2025_sel_666_account_voted_sorted.parquet`

If your files are elsewhere, either:
- Move them to the expected location, or
- Edit the import scripts to use different paths, or
- Pass the file path as a command line argument:
  ```bash
  python3 import_proxy_sel_account_unvoted.py /path/to/your/file.parquet
  ```

## 📈 Next Steps

After successful setup, you can:
1. Connect your applications to the proxy_sel database
2. Run analytics queries on the Account tables
3. Build dashboards using the imported data
4. Integrate with existing proxy account outreach workflows

## 🔗 Integration

The proxy_sel database is designed to integrate with the existing proxy account outreach system. The Account tables use the same schema pattern as other account tables in the system for consistency.
