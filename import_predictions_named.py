#!/usr/bin/env python3
"""
Import using MySQL LOAD DATA INFILE (without requiring global privileges)
"""

import mysql.connector
import csv
import tempfile
import os
from datetime import datetime

def parse_date(date_str):
    """Parse date in M/D/YYYY format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str, '%m/%d/%Y').strftime('%Y-%m-%d')
    except ValueError:
        return None

def import_csv_to_mysql():
    # Connect to database
    connection = mysql.connector.connect(
        host='localhost',
        user='webapp',
        password='webapppass',
        database='proxy_sds'
    )
    cursor = connection.cursor()
    
    # Read the CSV and create a prepared temp file
    input_file = '/home/syu/Documents/ProjectsNew/proxy_account_outreach/2025_predictions_sds_v2.1.csv'
    
    with open(input_file, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        
        # Process rows one by one with explicit INSERT statements
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
        
        count = 0
        for row in reader:
            # Process the row data
            data = {
                'proposal_master_skey': int(row['proposal_master_skey']) if row['proposal_master_skey'] else None,
                'director_master_skey': int(row['director_master_skey']) if row['director_master_skey'] not in ['', '-1'] else None,
                'final_key': row['final_key'] if row['final_key'] else None,
                'job_number': row['job_number'] if row['job_number'] else None,
                'issuer_name': row['issuer_name'] if row['issuer_name'] else None,
                'service': row['service'] if row['service'] else None,
                'cusip6': row['cusip6'] if row['cusip6'] else None,
                'mt_date': parse_date(row['mt_date']),
                'ml_date': parse_date(row['ml_date']),
                'record_date': parse_date(row['record_date']),
                'mgmt_rec': row['mgmt_rec'] if row['mgmt_rec'] else None,
                'proposal': row['proposal'] if row['proposal'] else None,
                'proposal_type': row['proposal_type'] if row['proposal_type'] else None,
                'director_number': int(row['director_number']) if row['director_number'] not in ['', '-1'] else None,
                'director_name': row['director_name'] if row['director_name'] not in ['', '-1'] else None,
                'category': row['Category'] if row['Category'] else None,
                'subcategory': row['Subcategory'] if row['Subcategory'] else None,
                'predicted_for_shares': float(row['predicted_for_shares']) if row['predicted_for_shares'] else None,
                'predicted_against_shares': float(row['predicted_against_shares']) if row['predicted_against_shares'] else None,
                'predicted_abstain_shares': float(row['predicted_abstain_shares']) if row['predicted_abstain_shares'] else None,
                'predicted_unvoted_shares': float(row['predicted_unvoted_shares']) if row['predicted_unvoted_shares'] else None,
                'total_for_shares': float(row['total_for_shares']) if row['total_for_shares'] else None,
                'total_against_shares': float(row['total_against_shares']) if row['total_against_shares'] else None,
                'total_abstain_shares': float(row['total_abstain_shares']) if row['total_abstain_shares'] else None,
                'total_unvoted_shares': float(row['total_unvoted_shares']) if row['total_unvoted_shares'] else None,
                'for_ratio_among_voted': float(row['ForRatioAmongVoted']) if row['ForRatioAmongVoted'] else None,
                'for_ratio_among_elig': float(row['ForRatioAmongElig']) if row['ForRatioAmongElig'] else None,
                'voting_ratio': float(row['VotingRatio']) if row['VotingRatio'] else None,
                'for_ratio_among_voted_true': float(row['ForRatioAmongVoted_true']) if row['ForRatioAmongVoted_true'] else None,
                'for_ratio_among_elig_true': float(row['ForRatioAmongElig_true']) if row['ForRatioAmongElig_true'] else None,
                'voting_ratio_true': float(row['VotingRatio_true']) if row['VotingRatio_true'] else None,
                'for_ratio_among_voted_incl_abs': float(row['ForRatioAmongVotedInclAbs']) if row['ForRatioAmongVotedInclAbs'] else None,
                'for_ratio_among_elig_incl_abs': float(row['ForRatioAmongEligInclAbs']) if row['ForRatioAmongEligInclAbs'] else None,
                'voting_ratio_incl_abs': float(row['VotingRatioInclAbs']) if row['VotingRatioInclAbs'] else None,
                'for_ratio_among_voted_incl_abs_true': float(row['ForRatioAmongVotedInclAbs_true']) if row['ForRatioAmongVotedInclAbs_true'] else None,
                'for_ratio_among_elig_incl_abs_true': float(row['ForRatioAmongEligInclAbs_true']) if row['ForRatioAmongEligInclAbs_true'] else None,
                'voting_ratio_incl_abs_true': float(row['VotingRatioInclAbs_true']) if row['VotingRatioInclAbs_true'] else None,
                'for_percentage': float(row['For %']) if row['For %'] else None,
                'against_percentage': float(row['Against %']) if row['Against %'] else None,
                'abstain_percentage': float(row['Abstain %']) if row['Abstain %'] else None,
                'for_percentage_true': float(row['For % True']) if row['For % True'] else None,
                'against_percentage_true': float(row['Against % True']) if row['Against % True'] else None,
                'abstain_percentage_true': float(row['Abstain % True']) if row['Abstain % True'] else None,
                'prediction_correct': True if row['prediction_correct'].upper() == 'TRUE' else False if row['prediction_correct'].upper() == 'FALSE' else None,
                'approved': True if row['approved'].upper() == 'TRUE' else False if row['approved'].upper() == 'FALSE' else None,
                'for_prospectus_2026': float(row['For (%) - From Prospectus 2026 File']) if row['For (%) - From Prospectus 2026 File'] else None,
                'against_prospectus_2026': row['Against (%) - From Prospectus 2026 File'] if row['Against (%) - From Prospectus 2026 File'] else None,
                'abstain_prospectus_2026': row['Abstain/Withhold (%) - From Prospectus 2026 File'] if row['Abstain/Withhold (%) - From Prospectus 2026 File'] else None,
            }
            
            cursor.execute(insert_sql, data)
            count += 1
            
            if count % 100 == 0:
                print(f"Inserted {count} rows...")
        
        connection.commit()
        print(f"Successfully imported {count} rows!")
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        total = cursor.fetchone()[0]
        print(f"Total rows in database: {total}")
    
    cursor.close()
    connection.close()

if __name__ == "__main__":
    print("Starting import...")
    import_csv_to_mysql()
    print("Import completed!")
