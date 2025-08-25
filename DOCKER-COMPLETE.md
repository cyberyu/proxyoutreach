# Complete Docker Setup for Proxy Account Outreach System

This Docker setup provides a comprehensive, self-contained proxy account outreach system with:

- **Dual Database Support**: Both `proxy` and `proxy_sds` databases
- **Specific Data Sources**: Ingests from designated CSV, Excel, and Parquet files
- **Complete Ingestion Pipeline**: Automated data import functionality
- **Production Ready**: Optimized for both development and production use

## 📋 Required Data Files

Before building, ensure these specific files are present in the project root:

### For `proxy` Database:
- `df_2025_279_account_voted_sorted_20250817.csv` → `account_voted` table
- `df_2025_279_account_unvoted_sorted_20250817.csv` → `account_unvoted` table
- `matched_results_279.xlsx` → `proposals_predictions` table

### For `proxy_sds` Database:
- `df_2025_sds_167_account_voted_sorted.parquet` → `account_voted` table
- `df_2025_sds_167_account_unvoted_sorted.parquet` → `account_unvoted` table
- `2025_predictions_sds_v2.1.csv` → `proposals_predictions` table

⚠️ **Important**: The build script will verify all files are present and halt if any are missing.

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the complete system
docker-compose -f docker-compose.complete.yml up -d

# View logs
docker-compose -f docker-compose.complete.yml logs -f

# Stop the system
docker-compose -f docker-compose.complete.yml down
```

### Option 2: Using Build Script

```bash
# Run the automated build script
./build-complete-docker.sh

# Follow the prompts and instructions
```

### Option 3: Manual Docker Build

```bash
# Build the image
docker build -f Dockerfile.complete -t proxy-outreach-complete .

# Run the container
docker run -d --name proxy-outreach-complete -p 3000:3000 proxy-outreach-complete
```

## 📊 What's Included

### Databases
- **proxy**: Main application database with account and outreach data
- **proxy_sds**: SDS-specific database with proposal predictions

### Sample Data Generated
- **279 Proposals**: Realistic proposal data with voting outcomes
- **15,000 Unvoted Accounts**: Account data for proxy database
- **8,500 Voted Accounts**: Voted account data for proxy database
- **12,000 SDS Accounts**: SDS-specific account data

### Data Formats Supported
- **CSV Files**: Account data import/export
- **Excel Files**: Proposal data with comprehensive voting information
- **Parquet Files**: Optimized SDS data storage and import

### Ingestion Scripts Included
- `import_csv_direct.py`: Direct CSV import to proxy database
- `import_excel_proposals.py`: Excel proposal data import
- `import_sds_unified_parquet.py`: Parquet file import for SDS data
- `import_predictions_sds.py`: SDS prediction data import

## 🗄️ Database Schema

### Proxy Database Tables

#### `account_unvoted`
```sql
- id (Primary Key)
- account_hash_key (Indexed)
- proposal_master_skey
- director_master_skey
- account_type
- shares_summable
- rank_of_shareholding
- score_model1
- prediction_model1
- created_at
```

#### `account_voted`
```sql
- id (Primary Key)
- account_hash_key (Indexed)
- proposal_master_skey
- director_master_skey
- account_type
- shares_summable
- rank_of_shareholding
- score_model1
- prediction_model1
- true_outcome
- created_at
```

#### `outreach`
```sql
- id (Primary Key)
- account_hash_key
- proposal_master_skey
- director_master_skey
- account_type
- shares_summable
- rank_of_shareholding
- score_model1
- prediction_model1
- target_prediction
- created_at
```

### Proxy SDS Database Tables

#### `proposals_predictions`
```sql
- id (Primary Key)
- proposal_master_skey (Indexed)
- director_master_skey
- issuer_name
- category
- proposal (TEXT)
- prediction_correct
- approved
- for_percentage
- against_percentage
- pred_for_shares, pred_against_shares, pred_abstain_shares, pred_unvoted_shares
- true_for_shares, true_against_shares, true_abstain_shares, true_unvoted_shares
- created_at
```

#### `account_voted` and `account_unvoted`
Similar structure to proxy database tables, optimized for SDS data.

## 📁 Data Directory Structure

The container creates the following data structure:

```
/usr/src/app/data/
├── csv/
│   ├── proxy_account_unvoted.csv
│   ├── proxy_account_voted.csv
│   └── sds_account_voted.csv
├── excel/
│   ├── proxy_proposals.xlsx
│   └── sds_proposals.xlsx
└── parquet/
    └── (parquet files if provided)
```

## 🔧 Adding Your Own Data

### For CSV Files
1. Place your CSV files in the `external-data/csv/` directory
2. Ensure they match the expected schema
3. Restart the container to trigger import

### For Excel Files
1. Place Excel files in the `external-data/excel/` directory
2. Files should contain proposal data with voting information
3. Restart the container to trigger import

### For Parquet Files
1. Place Parquet files in the `external-data/parquet/` directory
2. Files should contain 'voted' or 'unvoted' in the filename
3. Restart the container to trigger import

## 🌐 Accessing the Application

- **Web Interface**: http://localhost:3000
- **Admin Panel**: Admin login required (default admin functionality)
- **Database Access**: MySQL on localhost (from within container)

## 🔐 Default Credentials

- **MySQL Root**: `rootpass`
- **MySQL User**: `webapp` / `webapppass`
- **Databases**: `proxy`, `proxy_sds`

## 📋 Container Management

### View Logs
```bash
docker logs -f proxy-outreach-complete
```

### Access Container Shell
```bash
docker exec -it proxy-outreach-complete bash
```

### Connect to MySQL
```bash
# From within container
mysql -u webapp -pwebapppass proxy
mysql -u webapp -pwebapppass proxy_sds
```

### Restart Container
```bash
docker restart proxy-outreach-complete
```

## 🔍 Troubleshooting

### Container Won't Start
1. Check Docker logs: `docker logs proxy-outreach-complete`
2. Verify port 3000 is available
3. Ensure sufficient disk space for MySQL data

### Data Import Issues
1. Check file formats match expected schema
2. Verify file permissions in external-data directories
3. Check container logs for import errors

### Database Connection Issues
1. Wait for MySQL to fully initialize (can take 30-60 seconds)
2. Check MySQL error logs in container
3. Verify database credentials

### Performance Issues
1. Allocate more memory to Docker
2. Consider using persistent volumes for MySQL data
3. Monitor container resource usage

## 🚀 Production Deployment

### Environment Variables
```bash
# Set these in production
NODE_ENV=production
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_PASSWORD=your_webapp_password
```

### Security Considerations
1. Change default database passwords
2. Use environment-specific configurations
3. Enable SSL/TLS for database connections
4. Implement proper backup strategies

### Scaling
1. Use external MySQL database for multiple instances
2. Implement load balancing for web application
3. Use persistent storage for data files

## 📝 Data Import Scripts Reference

### CSV Import
```bash
# Inside container
python3 import_csv_direct.py
```

### Excel Import
```bash
# Inside container
python3 import_excel_proposals.py
```

### Parquet Import
```bash
# Inside container
python3 import_sds_unified_parquet.py
```

### SDS Predictions Import
```bash
# Inside container
python3 import_predictions_sds.py
```

## 🤝 Contributing

To add new data formats or improve ingestion:

1. Add new Python scripts to the root directory
2. Update the `start-complete.sh` script to include new imports
3. Add appropriate dependencies to `requirements.txt`
4. Update this documentation

## 📈 Monitoring and Analytics

The system includes:
- Database connection health checks
- Import success/failure logging
- Data validation and cleaning
- Performance metrics logging

Check the application logs for detailed import statistics and performance data.
