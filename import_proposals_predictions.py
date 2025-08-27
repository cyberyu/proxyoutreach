#!/usr/bin/env python3
"""
Import proposal predictions CSV data into multiple proxy databases
Creates proposals_predictions table in proxy_sds_calibrated, proxy_sel, and proxy_sel_calibrated
"""

import mysql.connector
import csv
import os
import argparse
from datetime import datetime

def parse_date(date_str):
    """Parse date in M/D/YYYY format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str, '%m/%d/%Y').strftime('%Y-%m-%d')
    except ValueError:
        return None

def get_db_connection(database_name):
    """Create database connection"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='webapp',
            password='webapppass',
            database=database_name,
            autocommit=False,
            buffered=True
        )
        return connection
    except mysql.connector.Error as err:
        print(f"❌ Error connecting to {database_name}: {err}")
        return None

def create_proposals_predictions_table(database_name):
    """Create proposals_predictions table with proper schema"""
    connection = get_db_connection(database_name)
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Drop table if exists to ensure clean start
        cursor.execute("DROP TABLE IF EXISTS proposals_predictions")
        
        # Create table with comprehensive schema
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
        print(f"✅ Created proposals_predictions table in {database_name}")
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ Error creating table in {database_name}: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

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
        'category': row.get('Category') or None,
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

def import_csv_to_database(csv_file, database_name):
    """Import CSV data into the specified database"""
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    connection = get_db_connection(database_name)
    if not connection:
        return False
    
    cursor = connection.cursor()
    
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
    
    try:
        print(f"📂 Reading CSV file: {csv_file}")
        file_size = os.path.getsize(csv_file) / (1024 * 1024)  # MB
        print(f"📊 File size: {file_size:.2f} MB")
        
        with open(csv_file, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            count = 0
            batch_size = 1000
            batch_data = []
            
            for row in reader:
                data = process_row_data(row)
                batch_data.append(data)
                count += 1
                
                # Process in batches
                if count % batch_size == 0:
                    cursor.executemany(insert_sql, batch_data)
                    connection.commit()
                    batch_data = []
                    print(f"📝 Processed {count} rows...")
            
            # Process remaining batch
            if batch_data:
                cursor.executemany(insert_sql, batch_data)
                connection.commit()
            
            print(f"✅ Successfully imported {count} rows into {database_name}")
            
            # Verify import
            cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
            total = cursor.fetchone()[0]
            print(f"📊 Total rows in {database_name}.proposals_predictions: {total}")
            return True
            
    except Exception as err:
        print(f"❌ Error importing to {database_name}: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

def main():
    parser = argparse.ArgumentParser(description='Import proposal predictions into multiple databases')
    parser.add_argument('--database', choices=['sds_calibrated', 'sel', 'sel_calibrated', 'all'], 
                       default='all', help='Target database (default: all)')
    parser.add_argument('--create-tables', action='store_true', 
                       help='Create tables before importing (default: True)')
    
    args = parser.parse_args()
    
    # Database and file mappings
    database_configs = {
        'sds_calibrated': {
            'database': 'proxy_sds_calibrated',
            'csv_file': 'backups/sds_proposal_calibrated.csv'
        },
        'sel': {
            'database': 'proxy_sel',
            'csv_file': 'backups/2025_Predictions_Brandon_sel_666.csv'
        },
        'sel_calibrated': {
            'database': 'proxy_sel_calibrated',
            'csv_file': 'backups/sel666_proposal_calibrated.csv'
        }
    }
    
    # Determine which databases to process
    if args.database == 'all':
        targets = list(database_configs.keys())
    else:
        targets = [args.database]
    
    print("🚀 Starting proposal predictions import...")
    print(f"📋 Target databases: {', '.join(targets)}")
    print("=" * 60)
    
    success_count = 0
    total_count = len(targets)
    
    for target in targets:
        config = database_configs[target]
        database_name = config['database']
        csv_file = config['csv_file']
        
        print(f"\n🔄 Processing {target} ({database_name})...")
        
        # Create table if requested
        if args.create_tables:
            if not create_proposals_predictions_table(database_name):
                print(f"❌ Failed to create table in {database_name}")
                continue
        
        # Import data
        if import_csv_to_database(csv_file, database_name):
            success_count += 1
        
        print("-" * 40)
    
    print(f"\n🎯 Import Summary:")
    print(f"✅ Successful: {success_count}/{total_count}")
    print(f"❌ Failed: {total_count - success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 All imports completed successfully!")
    else:
        print("⚠️  Some imports failed. Check error messages above.")

if __name__ == "__main__":
    main()
