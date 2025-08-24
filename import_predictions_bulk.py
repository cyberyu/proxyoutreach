#!/usr/bin/env python3
"""
Simplified import script for 2025_predictions_sds_v2.1.csv
Using executemany for better performance
"""

import csv
import mysql.connector
from datetime import datetime
import sys

def connect_to_database():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='webapp',
            password='webapppass',
            database='proxy_sds',
            allow_local_infile=True
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to MySQL: {e}")
        sys.exit(1)

def parse_date(date_str):
    """Parse date string"""
    if not date_str or date_str.strip() == '':
        return None
    
    try:
        return datetime.strptime(date_str.strip(), '%m/%d/%Y').date()
    except ValueError:
        return None

def parse_float(value):
    """Parse float value, handling scientific notation"""
    if not value or value.strip() == '':
        return None
    try:
        return float(value)
    except ValueError:
        return None

def parse_int(value):
    """Parse integer value"""
    if not value or value.strip() == '' or value == '-1':
        return None
    try:
        return int(value)
    except ValueError:
        return None

def parse_bool(value):
    """Parse boolean value"""
    if not value or value.strip() == '':
        return None
    return value.strip().upper() == 'TRUE'

def import_csv_data():
    """Import CSV data using executemany for better performance"""
    connection = connect_to_database()
    cursor = connection.cursor()
    
    # Clear existing data
    cursor.execute("DELETE FROM proposals_predictions")
    
    # Read CSV file
    csv_file = '/home/syu/Documents/ProjectsNew/proxy_account_outreach/2025_predictions_sds_v2.1.csv'
    
    # Prepare insert query with proper parameter count
    insert_query = """
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
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    data_to_insert = []
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # Prepare data tuple
                data = (
                    parse_int(row['proposal_master_skey']),
                    parse_int(row['director_master_skey']),
                    row['final_key'] or None,
                    row['job_number'] or None,
                    row['issuer_name'] or None,
                    row['service'] or None,
                    row['cusip6'] or None,
                    parse_date(row['mt_date']),
                    parse_date(row['ml_date']),
                    parse_date(row['record_date']),
                    row['mgmt_rec'] or None,
                    row['proposal'] or None,
                    row['proposal_type'] or None,
                    parse_int(row['director_number']),
                    row['director_name'] if row['director_name'] != '-1' else None,
                    row['Category'] or None,
                    row['Subcategory'] or None,
                    parse_float(row['predicted_for_shares']),
                    parse_float(row['predicted_against_shares']),
                    parse_float(row['predicted_abstain_shares']),
                    parse_float(row['predicted_unvoted_shares']),
                    parse_float(row['total_for_shares']),
                    parse_float(row['total_against_shares']),
                    parse_float(row['total_abstain_shares']),
                    parse_float(row['total_unvoted_shares']),
                    parse_float(row['ForRatioAmongVoted']),
                    parse_float(row['ForRatioAmongElig']),
                    parse_float(row['VotingRatio']),
                    parse_float(row['ForRatioAmongVoted_true']),
                    parse_float(row['ForRatioAmongElig_true']),
                    parse_float(row['VotingRatio_true']),
                    parse_float(row['ForRatioAmongVotedInclAbs']),
                    parse_float(row['ForRatioAmongEligInclAbs']),
                    parse_float(row['VotingRatioInclAbs']),
                    parse_float(row['ForRatioAmongVotedInclAbs_true']),
                    parse_float(row['ForRatioAmongEligInclAbs_true']),
                    parse_float(row['VotingRatioInclAbs_true']),
                    parse_float(row['For %']),
                    parse_float(row['Against %']),
                    parse_float(row['Abstain %']),
                    parse_float(row['For % True']),
                    parse_float(row['Against % True']),
                    parse_float(row['Abstain % True']),
                    parse_bool(row['prediction_correct']),
                    parse_bool(row['approved']),
                    parse_float(row['For (%) - From Prospectus 2026 File']),
                    row['Against (%) - From Prospectus 2026 File'] or None,
                    row['Abstain/Withhold (%) - From Prospectus 2026 File'] or None
                )
                
                data_to_insert.append(data)
                
                if len(data_to_insert) % 100 == 0:
                    print(f"Prepared {len(data_to_insert)} rows...")
                    
            except Exception as e:
                print(f"Error processing row {row_num}: {e}")
    
    # Execute bulk insert
    try:
        print(f"Inserting {len(data_to_insert)} rows...")
        cursor.executemany(insert_query, data_to_insert)
        connection.commit()
        
        print(f"Successfully imported {len(data_to_insert)} rows!")
        
        # Verify the import
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        total_count = cursor.fetchone()[0]
        print(f"Total rows in database: {total_count}")
        
        # Show sample data
        cursor.execute("""
            SELECT issuer_name, proposal, prediction_correct, approved 
            FROM proposals_predictions 
            LIMIT 5
        """)
        print("\nSample records:")
        for record in cursor.fetchall():
            print(f"  {record}")
            
    except Exception as e:
        print(f"Error during bulk insert: {e}")
        connection.rollback()
    
    cursor.close()
    connection.close()

if __name__ == "__main__":
    print("Starting import of 2025_predictions_sds_v2.1.csv...")
    import_csv_data()
    print("Import completed!")
