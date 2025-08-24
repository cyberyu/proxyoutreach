#!/usr/bin/env python3
"""
Import 2025_predictions_sds_v2.1.csv into proxy_sds.proposals_predictions table
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
    
    # Read CSV file
    csv_file = '/home/syu/Documents/ProjectsNew/proxy_account_outreach/2025_predictions_sds_v2.1.csv'
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        # Prepare insert query (excluding id and created_at as they are auto-generated)
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
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        success_count = 0
        error_count = 0
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 because header is row 1
            try:
                # Map CSV columns to database fields
                data = (
                    parse_numeric(row['proposal_master_skey']),
                    parse_numeric(row['director_master_skey']),
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
                    parse_numeric(row['director_number']),
                    row['director_name'] or None,
                    row['Category'] or None,
                    row['Subcategory'] or None,
                    parse_numeric(row['predicted_for_shares'], 2),
                    parse_numeric(row['predicted_against_shares'], 2),
                    parse_numeric(row['predicted_abstain_shares'], 2),
                    parse_numeric(row['predicted_unvoted_shares'], 2),
                    parse_numeric(row['total_for_shares'], 2),
                    parse_numeric(row['total_against_shares'], 2),
                    parse_numeric(row['total_abstain_shares'], 2),
                    parse_numeric(row['total_unvoted_shares'], 2),
                    parse_numeric(row['ForRatioAmongVoted'], 6),
                    parse_numeric(row['ForRatioAmongElig'], 6),
                    parse_numeric(row['VotingRatio'], 6),
                    parse_numeric(row['ForRatioAmongVoted_true'], 6),
                    parse_numeric(row['ForRatioAmongElig_true'], 6),
                    parse_numeric(row['VotingRatio_true'], 6),
                    parse_numeric(row['ForRatioAmongVotedInclAbs'], 6),
                    parse_numeric(row['ForRatioAmongEligInclAbs'], 6),
                    parse_numeric(row['VotingRatioInclAbs'], 6),
                    parse_numeric(row['ForRatioAmongVotedInclAbs_true'], 6),
                    parse_numeric(row['ForRatioAmongEligInclAbs_true'], 6),
                    parse_numeric(row['VotingRatioInclAbs_true'], 6),
                    parse_numeric(row['For %'], 4),
                    parse_numeric(row['Against %'], 4),
                    parse_numeric(row['Abstain %'], 4),
                    parse_numeric(row['For % True'], 4),
                    parse_numeric(row['Against % True'], 4),
                    parse_numeric(row['Abstain % True'], 4),
                    parse_boolean(row['prediction_correct']),
                    parse_boolean(row['approved']),
                    parse_numeric(row['For (%) - From Prospectus 2026 File'], 4),
                    row['Against (%) - From Prospectus 2026 File'] or None,
                    row['Abstain/Withhold (%) - From Prospectus 2026 File'] or None
                )
                
                cursor.execute(insert_query, data)
                success_count += 1
                
                if success_count % 100 == 0:
                    print(f"Processed {success_count} rows...")
                    
            except Exception as e:
                error_count += 1
                print(f"Error processing row {row_num}: {e}")
                print(f"Row data: {row}")
                if error_count > 10:  # Stop if too many errors
                    print("Too many errors, stopping import")
                    break
        
        # Commit the transaction
        connection.commit()
        
        print(f"\nImport completed!")
        print(f"Successfully imported: {success_count} rows")
        print(f"Errors: {error_count} rows")
        
        # Verify the import
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        total_count = cursor.fetchone()[0]
        print(f"Total rows in database: {total_count}")
    
    cursor.close()
    connection.close()

if __name__ == "__main__":
    print("Starting import of 2025_predictions_sds_v2.1.csv...")
    import_csv_data()
    print("Import completed!")
