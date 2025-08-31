#!/usr/bin/env python3
"""
Import Proposals Predictions - Bulk CSV Ingestion
Script to ingest multiple prediction CSV files into respective databases:
- 2025_Nov_to_July_Predictions_OriginalModel_SDS.csv → proxy_sds.proposals_predictions
- 2025_Nov_to_July_Predictions_CalibratedModel_SDS.csv → proxy_sds_calibrated.proposals_predictions  
- 2025_Nov_to_July_Predictions_OriginalModel_666.csv → proxy_sel.proposals_predictions
- 2025_Nov_to_July_Predictions_CalibratedModel_666.csv → proxy_sel_calibrated.proposals_predictions

This script drops existing proposals_predictions tables and recreates them with identical structure to proxy database.
Ignores the last 'merge_**' column from CSV files.
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

def parse_numeric(value, decimal_places=4):
    """Parse a numeric value from CSV with proper error handling"""
    if not value or value.strip() == '' or value.strip().lower() == 'null':
        return None
    
    try:
        # Remove any commas and strip whitespace
        cleaned_value = str(value).replace(',', '').strip()
        
        # Convert to Decimal for precision
        decimal_value = Decimal(cleaned_value)
        
        # Round to specified decimal places
        return round(float(decimal_value), decimal_places)
    
    except (ValueError, InvalidOperation, TypeError):
        print(f"⚠️ Warning: Could not parse numeric value '{value}', setting to None")
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
    """Drop existing proposals_predictions table and recreate with proxy database structure"""
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
            
            # Prepare insert query
            insert_query = """
            INSERT INTO proposals_predictions (
                proposal_master_skey, director_master_skey, issuer_name, category, proposal,
                prediction_correct, approved, for_percentage, against_percentage, abstain_percentage,
                predicted_for_shares, predicted_against_shares, predicted_abstain_shares, predicted_unvoted_shares,
                total_for_shares, total_against_shares, total_abstain_shares, total_unvoted_shares,
                meeting_date
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """
            
            success_count = 0
            error_count = 0
            batch_size = 1000
            batch_data = []
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 because header is row 1
                try:
                    # Extract and clean data (ignore merge columns)
                    proposal_master_skey = int(float(row.get('proposal_master_skey', 0))) if row.get('proposal_master_skey', '').strip() and float(row.get('proposal_master_skey', 0)) != -1 else None
                    director_master_skey = int(float(row.get('director_master_skey', 0))) if row.get('director_master_skey', '').strip() and float(row.get('director_master_skey', 0)) != -1 else None
                    issuer_name = row.get('issuer_name', '')[:500] if row.get('issuer_name', '').strip() else None
                    category = row.get('category', '')[:500] if row.get('category', '').strip() else None
                    proposal = row.get('proposal', '') if row.get('proposal', '').strip() else None
                    
                    # Boolean fields - handle True/False strings
                    prediction_correct_str = row.get('prediction_correct', '').strip().lower()
                    if prediction_correct_str in ['true', '1', 'yes']:
                        prediction_correct = 1
                    elif prediction_correct_str in ['false', '0', 'no']:
                        prediction_correct = 0
                    else:
                        prediction_correct = 0
                    
                    approved_str = row.get('approved', '').strip().lower()
                    if approved_str in ['true', '1', 'yes']:
                        approved = 1
                    elif approved_str in ['false', '0', 'no']:
                        approved = 0
                    else:
                        approved = 0
                    
                    # Percentage fields
                    for_percentage = parse_numeric(row.get('for_percentage'), 6)
                    against_percentage = parse_numeric(row.get('against_percentage'), 6)
                    abstain_percentage = parse_numeric(row.get('abstain_percentage'), 6)
                    
                    # Share fields
                    predicted_for_shares = parse_numeric(row.get('predicted_for_shares'), 4)
                    predicted_against_shares = parse_numeric(row.get('predicted_against_shares'), 4)
                    predicted_abstain_shares = parse_numeric(row.get('predicted_abstain_shares'), 4)
                    predicted_unvoted_shares = parse_numeric(row.get('predicted_unvoted_shares'), 4)
                    
                    total_for_shares = parse_numeric(row.get('total_for_shares'), 4)
                    total_against_shares = parse_numeric(row.get('total_against_shares'), 4)
                    total_abstain_shares = parse_numeric(row.get('total_abstain_shares'), 4)
                    total_unvoted_shares = parse_numeric(row.get('total_unvoted_shares'), 4)
                    
                    # Date field
                    meeting_date = parse_date(row.get('meeting_date'))
                    
                    # Prepare row data
                    row_data = (
                        proposal_master_skey, director_master_skey, issuer_name, category, proposal,
                        prediction_correct, approved, for_percentage, against_percentage, abstain_percentage,
                        predicted_for_shares, predicted_against_shares, predicted_abstain_shares, predicted_unvoted_shares,
                        total_for_shares, total_against_shares, total_abstain_shares, total_unvoted_shares,
                        meeting_date
                    )
                    
                    batch_data.append(row_data)
                    
                    # Execute batch insert
                    if len(batch_data) >= batch_size:
                        cursor.executemany(insert_query, batch_data)
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
                cursor.executemany(insert_query, batch_data)
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
    print("🚀 Starting bulk proposals_predictions import...")
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
    print(f"🎯 Bulk Import Complete!")
    print(f"⏰ End time: {datetime.now()}")
    print(f"📊 Summary: {success_count}/{total_files} files imported successfully")
    
    if success_count == total_files:
        print("🎉 All files imported successfully!")
        return 0
    else:
        print(f"⚠️ {total_files - success_count} files failed to import")
        return 1

if __name__ == "__main__":
    sys.exit(main())
