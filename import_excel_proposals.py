#!/usr/bin/env python3
"""
Excel Import Script for Proposals Predictions
Imports matched_results_279.xlsx into MySQL proposals_predictions table
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import sys
from datetime import datetime
import numpy as np

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'proxy',
    'user': 'webapp',
    'password': 'webapppass'
}

def clean_percentage_value(value):
    """Clean percentage values that might contain non-numeric characters"""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str):
        # Remove any non-numeric characters except decimal point and minus
        cleaned = ''.join(c for c in str(value) if c.isdigit() or c in '.-')
        try:
            return float(cleaned) if cleaned else None
        except ValueError:
            return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_date_convert(date_value):
    """Safely convert date values"""
    if pd.isna(date_value) or date_value is None:
        return None
    if isinstance(date_value, str):
        try:
            return pd.to_datetime(date_value).date()
        except:
            return None
    try:
        return date_value.date() if hasattr(date_value, 'date') else date_value
    except:
        return None

def safe_int_convert(value):
    """Safely convert integer values"""
    if pd.isna(value) or value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None

def safe_float_convert(value):
    """Safely convert float values"""
    if pd.isna(value) or value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_bool_convert(value):
    """Safely convert boolean values"""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'y')
    try:
        return bool(int(value))
    except:
        return None

def import_excel_to_mysql():
    """Import Excel data to MySQL database"""
    
    print("=== Excel Import Tool for Proposals Predictions ===")
    print()
    
    excel_file = 'matched_results_279.xlsx'
    
    # Check if file exists
    try:
        print(f"📖 Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file)
        print(f"✅ Successfully loaded {len(df)} rows from Excel file")
        print(f"📊 Columns found: {len(df.columns)}")
    except FileNotFoundError:
        print(f"❌ Error: {excel_file} not found")
        return False
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        return False
    
    # Connect to MySQL
    try:
        print("🔗 Connecting to MySQL database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        print("✅ Connected to MySQL database")
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return False
    
    try:
        # Prepare INSERT statement
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
            for_ratio_among_voted_incl_abs, for_ratio_among_elig_incl_abs, voting_ratio_incl_abs,
            for_ratio_among_voted_incl_abs_true, for_ratio_among_elig_incl_abs_true, voting_ratio_incl_abs_true,
            for_percentage, against_percentage, abstain_percentage,
            for_percentage_true, against_percentage_true, abstain_percentage_true,
            prediction_correct, approved, for_prospectus_2026, against_prospectus_2026, abstain_prospectus_2026
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        print("📥 Processing and inserting data...")
        successful_inserts = 0
        failed_inserts = 0
        
        for index, row in df.iterrows():
            try:
                # Prepare data with proper type conversion and null handling
                data = (
                    safe_int_convert(row['proposal_master_skey']),
                    safe_int_convert(row['director_master_skey']),
                    str(row['final_key']) if pd.notna(row['final_key']) else None,
                    str(row['job_number']) if pd.notna(row['job_number']) else None,
                    str(row['issuer_name']) if pd.notna(row['issuer_name']) else None,
                    str(row['service']) if pd.notna(row['service']) else None,
                    str(row['cusip6']) if pd.notna(row['cusip6']) else None,
                    safe_date_convert(row['mt_date']),
                    safe_date_convert(row['ml_date']),
                    safe_date_convert(row['record_date']),
                    str(row['mgmt_rec']) if pd.notna(row['mgmt_rec']) else None,
                    str(row['proposal']) if pd.notna(row['proposal']) else None,
                    str(row['proposal_type']) if pd.notna(row['proposal_type']) else None,
                    safe_int_convert(row['director_number']),
                    str(row['director_name']) if pd.notna(row['director_name']) else None,
                    str(row['Category']) if pd.notna(row['Category']) else None,
                    str(row['Subcategory']) if pd.notna(row['Subcategory']) else None,
                    safe_float_convert(row['predicted_for_shares']),
                    safe_float_convert(row['predicted_against_shares']),
                    safe_float_convert(row['predicted_abstain_shares']),
                    safe_float_convert(row['predicted_unvoted_shares']),
                    safe_float_convert(row['total_for_shares']),
                    safe_float_convert(row['total_against_shares']),
                    safe_float_convert(row['total_abstain_shares']),
                    safe_float_convert(row['total_unvoted_shares']),
                    safe_float_convert(row['ForRatioAmongVoted']),
                    safe_float_convert(row['ForRatioAmongElig']),
                    safe_float_convert(row['VotingRatio']),
                    safe_float_convert(row['ForRatioAmongVoted_true']),
                    safe_float_convert(row['ForRatioAmongElig_true']),
                    safe_float_convert(row['VotingRatio_true']),
                    safe_float_convert(row['ForRatioAmongVotedInclAbs']),
                    safe_float_convert(row['ForRatioAmongEligInclAbs']),
                    safe_float_convert(row['VotingRatioInclAbs']),
                    safe_float_convert(row['ForRatioAmongVotedInclAbs_true']),
                    safe_float_convert(row['ForRatioAmongEligInclAbs_true']),
                    safe_float_convert(row['VotingRatioInclAbs_true']),
                    safe_float_convert(row['For %']),
                    safe_float_convert(row['Against %']),
                    safe_float_convert(row['Abstain %']),
                    safe_float_convert(row['For % True']),
                    safe_float_convert(row['Against % True']),
                    safe_float_convert(row['Abstain % True']),
                    safe_bool_convert(row['prediction_correct']),
                    safe_bool_convert(row['approved']),
                    safe_float_convert(row['For (%) - From Prospectus 2026 File']),
                    clean_percentage_value(row['Against (%) - From Prospectus 2026 File']),
                    clean_percentage_value(row['Abstain/Withhold (%) - From Prospectus 2026 File'])
                )
                
                cursor.execute(insert_query, data)
                successful_inserts += 1
                
                # Progress indicator
                if (index + 1) % 50 == 0:
                    print(f"  📝 Processed {index + 1}/{len(df)} rows...")
                    
            except Exception as e:
                failed_inserts += 1
                print(f"⚠️  Warning: Failed to insert row {index + 1}: {e}")
                continue
        
        # Commit the transaction
        connection.commit()
        print(f"✅ Successfully inserted {successful_inserts} records")
        if failed_inserts > 0:
            print(f"⚠️  {failed_inserts} records failed to insert")
        
        # Verify the import
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        total_count = cursor.fetchone()[0]
        print(f"📊 Total records in proposals_predictions table: {total_count}")
        
        return True
        
    except Error as e:
        print(f"❌ Error during import: {e}")
        connection.rollback()
        return False
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("🔗 MySQL connection closed")

if __name__ == "__main__":
    print("Starting Excel import process...")
    print()
    
    success = import_excel_to_mysql()
    
    print()
    if success:
        print("🎉 Excel import completed successfully!")
        print()
        print("📝 Verify with:")
        print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM proposals_predictions;'")
        print("  sudo mysql -u root -e 'USE proxy; SELECT * FROM proposals_predictions LIMIT 5;'")
    else:
        print("❌ Excel import failed!")
        sys.exit(1)
