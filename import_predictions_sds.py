#!/usr/bin/env python3
"""
Import 2025_predictions_sds_v2.1.csv into proxy_sds.proposals_predictions table
"""

import csv
import mysql.connector
from datetime import datetime
import sys
import os

def connect_to_database():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='webapp',
            password='webapppass',
            database='proxy_sds'
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to MySQL: {e}")
        sys.exit(1)

def parse_date(date_str):
    """Parse date string in various formats"""
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = date_str.strip()
    
    # Try different date formats
    date_formats = [
        '%m/%d/%Y',  # 5/13/2025
        '%Y-%m-%d',  # 2025-05-13
        '%m-%d-%Y',  # 05-13-2025
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    print(f"Warning: Could not parse date: {date_str}")
    return None

def parse_numeric(value, decimal_places=None):
    """Parse numeric value, handling scientific notation and empty values"""
    if not value or value.strip() == '':
        return None
    
    try:
        # Handle scientific notation
        if 'E+' in value or 'E-' in value or 'e+' in value or 'e-' in value:
            float_val = float(value)
            if decimal_places is not None:
                return round(float_val, decimal_places)
            return float_val
        else:
            if '.' in value:
                float_val = float(value)
                if decimal_places is not None:
                    return round(float_val, decimal_places)
                return float_val
            else:
                return int(value)
    except (ValueError, TypeError):
        print(f"Warning: Could not parse numeric value: {value}")
        return None

def parse_boolean(value):
    """Parse boolean value"""
    if not value or value.strip() == '':
        return None
    
    value = value.strip().upper()
    if value in ['TRUE', 'T', '1', 'YES', 'Y']:
        return True
    elif value in ['FALSE', 'F', '0', 'NO', 'N']:
        return False
    else:
        print(f"Warning: Could not parse boolean value: {value}")
        return None

def import_csv_data():
    """Import CSV data into the database"""
    connection = connect_to_database()
    cursor = connection.cursor()
    
    # Read CSV file - use relative path for Docker
    csv_file = '2025_predictions_sds_v2.1.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    print(f"📥 Reading CSV file: {csv_file}")
    
    # Create table if it doesn't exist
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS proposals_predictions (
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
    print("✅ Table proposals_predictions created/verified in proxy_sds database")
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        print(f"📋 Available columns: {reader.fieldnames}")
        
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
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 because header is row 1
            try:
                # Extract and clean data
                proposal_master_skey = int(row.get('proposal_master_skey', 0)) if row.get('proposal_master_skey', '').strip() else None
                director_master_skey = int(row.get('director_master_skey', 0)) if row.get('director_master_skey', '').strip() else None
                issuer_name = row.get('issuer_name', '')[:500] if row.get('issuer_name', '').strip() else None
                category = row.get('category', '')[:500] if row.get('category', '').strip() else None
                proposal = row.get('proposal', '') if row.get('proposal', '').strip() else None
                
                # Boolean fields
                prediction_correct = bool(int(row.get('prediction_correct', 0))) if row.get('prediction_correct', '').strip() else False
                approved = bool(int(row.get('approved', 0))) if row.get('approved', '').strip() else False
                
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
                meeting_date = parse_date(row.get('meeting_date', ''))
                
                # Prepare data tuple
                data = (
                    proposal_master_skey, director_master_skey, issuer_name, category, proposal,
                    prediction_correct, approved, for_percentage, against_percentage, abstain_percentage,
                    predicted_for_shares, predicted_against_shares, predicted_abstain_shares, predicted_unvoted_shares,
                    total_for_shares, total_against_shares, total_abstain_shares, total_unvoted_shares,
                    meeting_date
                )
                
                cursor.execute(insert_query, data)
                success_count += 1
                
                if success_count % 100 == 0:
                    print(f"📝 Processed {success_count} rows...")
                    
            except Exception as e:
                error_count += 1
                print(f"⚠️ Error processing row {row_num}: {e}")
                if error_count > 10:  # Stop if too many errors
                    print("❌ Too many errors, stopping import")
                    break
        
        # Commit the transaction
        connection.commit()
        
        print(f"\n✅ Import completed!")
        print(f"📊 Successfully imported: {success_count} rows")
        print(f"❌ Errors: {error_count} rows")
        
        # Verify the import
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        total_count = cursor.fetchone()[0]
        print(f"🔍 Total rows in database: {total_count}")
    
    cursor.close()
    connection.close()
    return True
if __name__ == "__main__":
    print("🚀 Starting import of 2025_predictions_sds_v2.1.csv...")
    success = import_csv_data()
    if success:
        print("✅ Import completed successfully!")
    else:
        print("❌ Import failed!")
        sys.exit(1)
