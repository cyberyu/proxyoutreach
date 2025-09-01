#!/usr/bin/env python3
"""
Import Proposals Predictions - Comprehensive Bulk CSV Ingestion
Script to ingest ALL fields from multiple prediction CSV files into respective databases:
- 2025_Nov_to_July_Predictions_OriginalModel_SDS.csv → proxy_sds.proposals_predictions
- 2025_Nov_to_July_Predictions_CalibratedModel_SDS.csv → proxy_sds_calibrated.proposals_predictions  
- 2025_Nov_to_July_Predictions_OriginalModel_666.csv → proxy_sel.proposals_predictions
- 2025_Nov_to_July_Predictions_CalibratedModel_666.csv → proxy_sel_calibrated.proposals_predictions

This script drops existing proposals_predictions tables and recreates them with comprehensive structure.
Imports ALL CSV fields except the last 'merged_proposal' column.
"""

import mysql.connector
import csv
import sys
import os
from datetime import datetime, date
from decimal import Decimal, InvalidOperation

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'webapp',
    'password': 'webapppass'
}

# CSV to Database mapping
CSV_DATABASE_MAPPING = {
    'docker/2025_Nov_to_July_Predictions_OriginalModel_SDS.csv': 'proxy_sds',
    'docker/2025_Nov_to_July_Predictions_CalibratedModel_SDS.csv': 'proxy_sds_calibrated',
    'docker/2025_Nov_to_July_Predictions_OriginalModel_666.csv': 'proxy_sel',
    'docker/2025_Nov_to_July_Predictions_CalibratedModel_666.csv': 'proxy_sel_calibrated'
}

def safe_float(value):
    """Safely convert to float"""
    if not value or value.strip() == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_int(value):
    """Safely convert to int"""
    if not value or value.strip() == '' or str(value).strip() == '-1':
        return None
    try:
        return int(float(value))  # Handle cases like "123.0"
    except (ValueError, TypeError):
        return None

def safe_bool(value):
    """Safely convert to boolean"""
    if not value or value.strip() == '':
        return None
    value_upper = str(value).upper().strip()
    if value_upper in ['TRUE', '1', 'YES', 'Y']:
        return True
    elif value_upper in ['FALSE', '0', 'NO', 'N']:
        return False
    return None

def parse_date(date_str):
    """Parse date string with multiple format support"""
    if not date_str or date_str.strip() == '' or date_str.strip().lower() == 'null':
        return None
    
    date_formats = [
        '%Y-%m-%d',      # 2024-12-31
        '%m/%d/%Y',      # 12/31/2024
        '%d/%m/%Y',      # 31/12/2024
        '%Y/%m/%d',      # 2024/12/31
        '%m-%d-%Y',      # 12-31-2024
        '%d-%m-%Y'       # 31-12-2024
    ]
    
    for date_format in date_formats:
        try:
            return datetime.strptime(date_str.strip(), date_format).date()
        except ValueError:
            continue
    
    print(f"⚠️ Warning: Could not parse date '{date_str}', setting to None")
    return None

def create_database_connection(database_name):
    """Create database connection for specific database"""
    try:
        connection = mysql.connector.connect(
            **DB_CONFIG,
            database=database_name,
            charset='utf8mb4',
            use_unicode=True
        )
        return connection
    except mysql.connector.Error as err:
        print(f"❌ Error connecting to database {database_name}: {err}")
        return None

def drop_and_create_proposals_predictions_table(database_name):
    """Drop existing proposals_predictions table and recreate with comprehensive structure"""
    connection = create_database_connection(database_name)
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        print(f"🗑️ Dropping existing proposals_predictions table in {database_name}...")
        cursor.execute("DROP TABLE IF EXISTS proposals_predictions")
        
        print(f"🏗️ Creating proposals_predictions table in {database_name}...")
        create_table_sql = """
        CREATE TABLE proposals_predictions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            proposal_master_skey INT,
            director_master_skey INT,
            final_key VARCHAR(1000),
            job_number VARCHAR(50),
            issuer_name VARCHAR(200),
            service VARCHAR(50),
            cusip6 VARCHAR(50),
            mt_date DATE,
            ml_date DATE,
            record_date DATE,
            mgmt_rec VARCHAR(50),
            proposal TEXT,
            proposal_type VARCHAR(50),
            director_number INT,
            director_name VARCHAR(50),
            category VARCHAR(50),
            subcategory VARCHAR(50),
            predicted_for_shares BIGINT,
            predicted_against_shares BIGINT,
            predicted_abstain_shares BIGINT,
            predicted_unvoted_shares BIGINT,
            total_for_shares BIGINT,
            total_against_shares BIGINT,
            total_abstain_shares BIGINT,
            total_unvoted_shares BIGINT,
            for_ratio_among_voted DECIMAL(8,4),
            for_ratio_among_elig DECIMAL(8,4),
            voting_ratio DECIMAL(8,4),
            for_ratio_among_voted_true DECIMAL(8,4),
            for_ratio_among_elig_true DECIMAL(8,4),
            voting_ratio_true DECIMAL(8,4),
            for_ratio_among_voted_incl_abs DECIMAL(8,4),
            for_ratio_among_elig_incl_abs DECIMAL(8,4),
            voting_ratio_incl_abs DECIMAL(8,4),
            for_ratio_among_voted_incl_abs_true DECIMAL(8,4),
            for_ratio_among_elig_incl_abs_true DECIMAL(8,4),
            voting_ratio_incl_abs_true DECIMAL(8,4),
            for_percentage DECIMAL(8,4),
            against_percentage DECIMAL(8,4),
            abstain_percentage DECIMAL(8,4),
            for_percentage_true DECIMAL(8,4),
            against_percentage_true DECIMAL(8,4),
            abstain_percentage_true DECIMAL(8,4),
            prediction_correct BOOLEAN,
            approved BOOLEAN,
            for_prospectus_2026 DECIMAL(8,4),
            against_prospectus_2026 VARCHAR(50),
            abstain_prospectus_2026 VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_proposal_skey (proposal_master_skey),
            INDEX idx_director_skey (director_master_skey),
            INDEX idx_prediction_correct (prediction_correct),
            INDEX idx_approved (approved)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        print(f"✅ Successfully created proposals_predictions table in {database_name}")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ Error creating table in {database_name}: {err}")
        if connection:
            connection.close()
        return False

def process_row_data(row):
    """Process a CSV row into database-ready format"""
    # Handle different CSV formats (quoted vs unquoted)
    data = {
        'proposal_master_skey': safe_int(row.get('proposal_master_skey')),
        'director_master_skey': safe_int(row.get('director_master_skey')),
        'final_key': row.get('final_key') or None,
        'job_number': row.get('job_number') or None,
        'issuer_name': row.get('issuer_name') or None,
        'service': row.get('service') or None,
        'cusip6': row.get('cusip6') or None,
        'mt_date': parse_date(row.get('mt_date')),
        'ml_date': parse_date(row.get('ml_date')),
        'record_date': parse_date(row.get('record_date')),
        'mgmt_rec': row.get('mgmt_rec') or None,
        'proposal': row.get('proposal') or None,
        'proposal_type': row.get('proposal_type') or None,
        'director_number': safe_int(row.get('director_number')),
        'director_name': row.get('director_name') if row.get('director_name') not in ['', '-1'] else None,
        'category': row.get('Category') or None,  # Note: CSV uses 'Category' not 'category'
        'subcategory': row.get('Subcategory') or None,
        'predicted_for_shares': safe_int(row.get('predicted_for_shares')),
        'predicted_against_shares': safe_int(row.get('predicted_against_shares')),
        'predicted_abstain_shares': safe_int(row.get('predicted_abstain_shares')),
        'predicted_unvoted_shares': safe_int(row.get('predicted_unvoted_shares')),
        'total_for_shares': safe_int(row.get('total_for_shares')),
        'total_against_shares': safe_int(row.get('total_against_shares')),
        'total_abstain_shares': safe_int(row.get('total_abstain_shares')),
        'total_unvoted_shares': safe_int(row.get('total_unvoted_shares')),
        'for_ratio_among_voted': safe_float(row.get('ForRatioAmongVoted')),
        'for_ratio_among_elig': safe_float(row.get('ForRatioAmongElig')),
        'voting_ratio': safe_float(row.get('VotingRatio')),
        'for_ratio_among_voted_true': safe_float(row.get('ForRatioAmongVoted_true')),
        'for_ratio_among_elig_true': safe_float(row.get('ForRatioAmongElig_true')),
        'voting_ratio_true': safe_float(row.get('VotingRatio_true')),
        'for_ratio_among_voted_incl_abs': safe_float(row.get('ForRatioAmongVotedInclAbs')),
        'for_ratio_among_elig_incl_abs': safe_float(row.get('ForRatioAmongEligInclAbs')),
        'voting_ratio_incl_abs': safe_float(row.get('VotingRatioInclAbs')),
        'for_ratio_among_voted_incl_abs_true': safe_float(row.get('ForRatioAmongVotedInclAbs_true')),
        'for_ratio_among_elig_incl_abs_true': safe_float(row.get('ForRatioAmongEligInclAbs_true')),
        'voting_ratio_incl_abs_true': safe_float(row.get('VotingRatioInclAbs_true')),
        'for_percentage': safe_float(row.get('For %')),
        'against_percentage': safe_float(row.get('Against %')),
        'abstain_percentage': safe_float(row.get('Abstain %')),
        'for_percentage_true': safe_float(row.get('For % True')),
        'against_percentage_true': safe_float(row.get('Against % True')),
        'abstain_percentage_true': safe_float(row.get('Abstain % True')),
        'prediction_correct': safe_bool(row.get('prediction_correct')),
        'approved': safe_bool(row.get('approved')),
        'for_prospectus_2026': safe_float(row.get('For (%) - From Prospectus 2026 File')),
        'against_prospectus_2026': row.get('Against (%) - From Prospectus 2026 File') or None,
        'abstain_prospectus_2026': row.get('Abstain/Withhold (%) - From Prospectus 2026 File') or None,
    }
    return data

def import_csv_to_database(csv_file_path, database_name):
    """Import CSV data into proposals_predictions table"""
    if not os.path.exists(csv_file_path):
        print(f"❌ CSV file not found: {csv_file_path}")
        return False
    
    connection = create_database_connection(database_name)
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        print(f"📂 Reading CSV file: {csv_file_path}")
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Get columns and filter out merge columns
            original_columns = reader.fieldnames
            print(f"📋 Original CSV columns: {original_columns}")
            
            # Filter out merge columns (last column that starts with 'merge_')
            filtered_columns = [col for col in original_columns if not col.lower().startswith('merge_')]
            print(f"📋 Filtered columns (excluding merge_* columns): {filtered_columns}")
            
            # Insert SQL with all columns
            insert_sql = """
            INSERT INTO proposals_predictions (
                proposal_master_skey, director_master_skey, final_key, job_number,
                issuer_name, service, cusip6, mt_date, ml_date, record_date,
                mgmt_rec, proposal, proposal_type, director_number, director_name,
                category, subcategory, predicted_for_shares, predicted_against_shares,
                predicted_abstain_shares, predicted_unvoted_shares, total_for_shares,
                total_against_shares, total_abstain_shares, total_unvoted_shares,
                for_ratio_among_voted, for_ratio_among_elig, voting_ratio,
                for_ratio_among_voted_true, for_ratio_among_elig_true, voting_ratio_true,
                for_ratio_among_voted_incl_abs, for_ratio_among_elig_incl_abs,
                voting_ratio_incl_abs, for_ratio_among_voted_incl_abs_true,
                for_ratio_among_elig_incl_abs_true, voting_ratio_incl_abs_true,
                for_percentage, against_percentage, abstain_percentage,
                for_percentage_true, against_percentage_true, abstain_percentage_true,
                prediction_correct, approved, for_prospectus_2026,
                against_prospectus_2026, abstain_prospectus_2026
            ) VALUES (
                %(proposal_master_skey)s, %(director_master_skey)s, %(final_key)s, %(job_number)s,
                %(issuer_name)s, %(service)s, %(cusip6)s, %(mt_date)s, %(ml_date)s, %(record_date)s,
                %(mgmt_rec)s, %(proposal)s, %(proposal_type)s, %(director_number)s, %(director_name)s,
                %(category)s, %(subcategory)s, %(predicted_for_shares)s, %(predicted_against_shares)s,
                %(predicted_abstain_shares)s, %(predicted_unvoted_shares)s, %(total_for_shares)s,
                %(total_against_shares)s, %(total_abstain_shares)s, %(total_unvoted_shares)s,
                %(for_ratio_among_voted)s, %(for_ratio_among_elig)s, %(voting_ratio)s,
                %(for_ratio_among_voted_true)s, %(for_ratio_among_elig_true)s, %(voting_ratio_true)s,
                %(for_ratio_among_voted_incl_abs)s, %(for_ratio_among_elig_incl_abs)s,
                %(voting_ratio_incl_abs)s, %(for_ratio_among_voted_incl_abs_true)s,
                %(for_ratio_among_elig_incl_abs_true)s, %(voting_ratio_incl_abs_true)s,
                %(for_percentage)s, %(against_percentage)s, %(abstain_percentage)s,
                %(for_percentage_true)s, %(against_percentage_true)s, %(abstain_percentage_true)s,
                %(prediction_correct)s, %(approved)s, %(for_prospectus_2026)s,
                %(against_prospectus_2026)s, %(abstain_prospectus_2026)s
            )
            """
            
            success_count = 0
            error_count = 0
            batch_size = 1000
            batch_data = []
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 because header is row 1
                try:
                    data = process_row_data(row)
                    batch_data.append(data)
                    
                    # Execute batch insert
                    if len(batch_data) >= batch_size:
                        cursor.executemany(insert_sql, batch_data)
                        connection.commit()
                        success_count += len(batch_data)
                        print(f"✅ Inserted batch of {len(batch_data)} rows (Total: {success_count})")
                        batch_data = []
                    
                except Exception as e:
                    error_count += 1
                    print(f"❌ Error processing row {row_num}: {e}")
                    if error_count > 100:  # Stop if too many errors
                        print(f"💥 Too many errors ({error_count}), stopping import")
                        break
            
            # Insert remaining batch
            if batch_data:
                cursor.executemany(insert_sql, batch_data)
                connection.commit()
                success_count += len(batch_data)
                print(f"✅ Inserted final batch of {len(batch_data)} rows")
            
            # Verify final count
            cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
            total_count = cursor.fetchone()[0]
            
            print(f"\n📊 Import Summary for {database_name}:")
            print(f"   ✅ Successfully imported: {success_count} rows")
            print(f"   ❌ Errors encountered: {error_count} rows")
            print(f"   📊 Total rows in database: {total_count}")
            
            cursor.close()
            connection.close()
            return True
            
    except Exception as e:
        print(f"❌ Error importing CSV {csv_file_path} to {database_name}: {e}")
        if connection:
            connection.close()
        return False

def main():
    """Main function to process all CSV files"""
    print("🚀 Starting comprehensive bulk proposals_predictions import...")
    print(f"⏰ Start time: {datetime.now()}")
    print("=" * 80)
    
    success_count = 0
    total_files = len(CSV_DATABASE_MAPPING)
    
    for csv_filename, database_name in CSV_DATABASE_MAPPING.items():
        print(f"\n📂 Processing: {csv_filename} → {database_name}.proposals_predictions")
        print("-" * 60)
        
        # Check if CSV file exists
        if not os.path.exists(csv_filename):
            print(f"⚠️ CSV file not found: {csv_filename}")
            print(f"   Please ensure the file exists in the current directory")
            continue
        
        # Drop and recreate table
        if not drop_and_create_proposals_predictions_table(database_name):
            print(f"❌ Failed to create table in {database_name}")
            continue
        
        # Import CSV data
        if import_csv_to_database(csv_filename, database_name):
            success_count += 1
            print(f"✅ Successfully completed {csv_filename} → {database_name}")
        else:
            print(f"❌ Failed to import {csv_filename} → {database_name}")
    
    print("\n" + "=" * 80)
    print(f"🎯 Comprehensive Bulk Import Complete!")
    print(f"⏰ End time: {datetime.now()}")
    print(f"📊 Summary: {success_count}/{total_files} files imported successfully")
    
    if success_count == total_files:
        print("🎉 All files imported successfully with ALL CSV fields!")
        return 0
    else:
        print(f"⚠️ {total_files - success_count} files failed to import")
        return 1

if __name__ == "__main__":
    sys.exit(main())
