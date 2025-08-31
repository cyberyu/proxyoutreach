#!/usr/bin/env python3
"""
Verify Proposals Predictions Import
Quick verification script to check the imported data in all databases
"""

import mysql.connector
import sys

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'webapp',
    'password': 'webapppass'
}

# Databases to check
DATABASES = ['proxy_sds', 'proxy_sds_calibrated', 'proxy_sel', 'proxy_sel_calibrated']

def verify_database(database_name):
    """Verify proposals_predictions table in database"""
    try:
        connection = mysql.connector.connect(
            **DB_CONFIG,
            database=database_name
        )
        cursor = connection.cursor()
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'proposals_predictions'")
        if not cursor.fetchone():
            print(f"❌ {database_name}: proposals_predictions table does not exist")
            return False
        
        # Get row count
        cursor.execute("SELECT COUNT(*) FROM proposals_predictions")
        row_count = cursor.fetchone()[0]
        
        # Get sample of data
        cursor.execute("""
            SELECT 
                proposal_master_skey, 
                director_master_skey, 
                issuer_name, 
                category,
                approved,
                meeting_date
            FROM proposals_predictions 
            LIMIT 3
        """)
        sample_rows = cursor.fetchall()
        
        # Get unique issuers count
        cursor.execute("SELECT COUNT(DISTINCT issuer_name) FROM proposals_predictions WHERE issuer_name IS NOT NULL")
        unique_issuers = cursor.fetchone()[0]
        
        # Get date range
        cursor.execute("SELECT MIN(meeting_date), MAX(meeting_date) FROM proposals_predictions WHERE meeting_date IS NOT NULL")
        date_range = cursor.fetchone()
        
        print(f"✅ {database_name}:")
        print(f"   📊 Total rows: {row_count:,}")
        print(f"   🏢 Unique issuers: {unique_issuers:,}")
        print(f"   📅 Date range: {date_range[0]} to {date_range[1]}")
        print(f"   📋 Sample data:")
        for i, row in enumerate(sample_rows, 1):
            print(f"      {i}. Proposal: {row[0]}, Director: {row[1]}, Issuer: {row[2][:30]}...")
        print()
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ {database_name}: Error - {err}")
        return False

def main():
    """Main verification function"""
    print("🔍 Verifying Proposals Predictions Import")
    print("=" * 50)
    print()
    
    success_count = 0
    
    for database_name in DATABASES:
        if verify_database(database_name):
            success_count += 1
    
    print("=" * 50)
    print(f"📊 Verification Summary: {success_count}/{len(DATABASES)} databases verified successfully")
    
    if success_count == len(DATABASES):
        print("🎉 All databases verified successfully!")
        return 0
    else:
        print(f"⚠️ {len(DATABASES) - success_count} database(s) have issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())
