#!/usr/bin/env python3
"""
Import outreach data into multiple proxy databases
Creates outreach table in proxy_sds_calibrated, proxy_sel, and proxy_sel_calibrated
with identical structure to proxy.outreach
"""

import mysql.connector
import csv
import os
import argparse
from datetime import datetime

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

def create_outreach_table(database_name):
    """Create outreach table with identical structure to proxy.outreach"""
    connection = get_db_connection(database_name)
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Drop table if exists to ensure clean start
        cursor.execute("DROP TABLE IF EXISTS outreach")
        
        # Create table with identical schema to proxy.outreach
        create_table_sql = """
        CREATE TABLE outreach (
            id INT AUTO_INCREMENT PRIMARY KEY,
            row_index INT,
            unnamed_col VARCHAR(255),
            account_hash_key VARCHAR(255) NOT NULL,
            proposal_master_skey BIGINT,
            director_master_skey BIGINT,
            account_type VARCHAR(100),
            shares_summable DECIMAL(20,2),
            rank_of_shareholding INT,
            score_model1 DECIMAL(10,6),
            prediction_model1 TINYINT,
            Target_encoded INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_outreach_triplet (account_hash_key, proposal_master_skey, director_master_skey),
            INDEX idx_outreach_hash (account_hash_key),
            INDEX idx_outreach_pm (proposal_master_skey),
            INDEX idx_outreach_dm (director_master_skey)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        print(f"✅ Created outreach table in {database_name}")
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

def safe_bigint(value):
    """Safely convert to bigint"""
    if not value or value.strip() == '' or str(value).strip() == '-1':
        return None
    try:
        return int(float(value))  # Handle cases like "123.0"
    except (ValueError, TypeError):
        return None

def safe_tinyint(value):
    """Safely convert to tinyint (0-255)"""
    if not value or value.strip() == '':
        return None
    try:
        val = int(float(value))
        return max(0, min(255, val))  # Clamp to tinyint range
    except (ValueError, TypeError):
        return None

def process_row_data(row):
    """Process a CSV row into database-ready format"""
    data = {
        'row_index': safe_int(row.get('row_index')),
        'unnamed_col': row.get('unnamed_col') or None,
        'account_hash_key': row.get('account_hash_key') or '',  # NOT NULL field
        'proposal_master_skey': safe_bigint(row.get('proposal_master_skey')),
        'director_master_skey': safe_bigint(row.get('director_master_skey')),
        'account_type': row.get('account_type') or None,
        'shares_summable': safe_float(row.get('shares_summable')),
        'rank_of_shareholding': safe_int(row.get('rank_of_shareholding')),
        'score_model1': safe_float(row.get('score_model1')),
        'prediction_model1': safe_tinyint(row.get('prediction_model1')),
        'Target_encoded': safe_int(row.get('Target_encoded')),
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
    
    # Insert SQL with all columns except id and created_at (auto-generated)
    insert_sql = """
    INSERT INTO outreach (
        row_index, unnamed_col, account_hash_key, proposal_master_skey,
        director_master_skey, account_type, shares_summable, rank_of_shareholding,
        score_model1, prediction_model1, Target_encoded
    ) VALUES (
        %(row_index)s, %(unnamed_col)s, %(account_hash_key)s, %(proposal_master_skey)s,
        %(director_master_skey)s, %(account_type)s, %(shares_summable)s, %(rank_of_shareholding)s,
        %(score_model1)s, %(prediction_model1)s, %(Target_encoded)s
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
            duplicate_count = 0
            
            for row in reader:
                data = process_row_data(row)
                
                # Skip rows with empty account_hash_key (required field)
                if not data['account_hash_key']:
                    continue
                    
                batch_data.append(data)
                count += 1
                
                # Process in batches
                if count % batch_size == 0:
                    try:
                        cursor.executemany(insert_sql, batch_data)
                        connection.commit()
                        batch_data = []
                        print(f"📝 Processed {count} rows...")
                    except mysql.connector.IntegrityError as err:
                        if "Duplicate entry" in str(err):
                            # Handle duplicate entries by inserting one by one
                            connection.rollback()
                            for data_row in batch_data:
                                try:
                                    cursor.execute(insert_sql, data_row)
                                    connection.commit()
                                except mysql.connector.IntegrityError:
                                    duplicate_count += 1
                                    connection.rollback()
                            batch_data = []
                            print(f"📝 Processed {count} rows (skipped {duplicate_count} duplicates)...")
                        else:
                            raise
            
            # Process remaining batch
            if batch_data:
                try:
                    cursor.executemany(insert_sql, batch_data)
                    connection.commit()
                except mysql.connector.IntegrityError as err:
                    if "Duplicate entry" in str(err):
                        connection.rollback()
                        for data_row in batch_data:
                            try:
                                cursor.execute(insert_sql, data_row)
                                connection.commit()
                            except mysql.connector.IntegrityError:
                                duplicate_count += 1
                                connection.rollback()
                    else:
                        raise
            
            print(f"✅ Successfully imported {count - duplicate_count} rows into {database_name}")
            if duplicate_count > 0:
                print(f"⚠️  Skipped {duplicate_count} duplicate entries")
            
            # Verify import
            cursor.execute("SELECT COUNT(*) FROM outreach")
            total = cursor.fetchone()[0]
            print(f"📊 Total rows in {database_name}.outreach: {total}")
            return True
            
    except Exception as err:
        print(f"❌ Error importing to {database_name}: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

def copy_from_proxy_database(target_database):
    """Copy outreach data from proxy database to target database"""
    source_connection = get_db_connection('proxy')
    target_connection = get_db_connection(target_database)
    
    if not source_connection or not target_connection:
        return False
    
    source_cursor = source_connection.cursor()
    target_cursor = target_connection.cursor()
    
    try:
        print(f"📂 Copying data from proxy.outreach to {target_database}.outreach")
        
        # Get all data from source
        source_cursor.execute("""
            SELECT row_index, unnamed_col, account_hash_key, proposal_master_skey,
                   director_master_skey, account_type, shares_summable, rank_of_shareholding,
                   score_model1, prediction_model1, Target_encoded
            FROM outreach
        """)
        
        rows = source_cursor.fetchall()
        print(f"📊 Found {len(rows)} rows in proxy.outreach")
        
        if not rows:
            print("⚠️  No data found in proxy.outreach")
            return True
        
        # Insert into target database
        insert_sql = """
        INSERT INTO outreach (
            row_index, unnamed_col, account_hash_key, proposal_master_skey,
            director_master_skey, account_type, shares_summable, rank_of_shareholding,
            score_model1, prediction_model1, Target_encoded
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        batch_size = 1000
        duplicate_count = 0
        
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            try:
                target_cursor.executemany(insert_sql, batch)
                target_connection.commit()
                print(f"📝 Copied {min(i+batch_size, len(rows))} rows...")
            except mysql.connector.IntegrityError as err:
                if "Duplicate entry" in str(err):
                    target_connection.rollback()
                    # Insert one by one for this batch
                    for row in batch:
                        try:
                            target_cursor.execute(insert_sql, row)
                            target_connection.commit()
                        except mysql.connector.IntegrityError:
                            duplicate_count += 1
                            target_connection.rollback()
                    print(f"📝 Copied {min(i+batch_size, len(rows))} rows (skipped {duplicate_count} duplicates)...")
                else:
                    raise
        
        print(f"✅ Successfully copied {len(rows) - duplicate_count} rows to {target_database}")
        if duplicate_count > 0:
            print(f"⚠️  Skipped {duplicate_count} duplicate entries")
        
        # Verify copy
        target_cursor.execute("SELECT COUNT(*) FROM outreach")
        total = target_cursor.fetchone()[0]
        print(f"📊 Total rows in {target_database}.outreach: {total}")
        return True
        
    except Exception as err:
        print(f"❌ Error copying to {target_database}: {err}")
        target_connection.rollback()
        return False
    finally:
        source_cursor.close()
        source_connection.close()
        target_cursor.close()
        target_connection.close()

def main():
    parser = argparse.ArgumentParser(description='Import outreach data into multiple databases')
    parser.add_argument('--database', choices=['sds_calibrated', 'sel', 'sel_calibrated', 'all'], 
                       default='all', help='Target database (default: all)')
    parser.add_argument('--create-tables', action='store_true', 
                       help='Create tables before importing (default: True)')
    parser.add_argument('--csv-file', type=str, 
                       help='CSV file to import (if not specified, copies from proxy.outreach)')
    parser.add_argument('--copy-from-proxy', action='store_true',
                       help='Copy data from proxy.outreach instead of importing CSV')
    
    args = parser.parse_args()
    
    # Database mappings
    database_configs = {
        'sds_calibrated': 'proxy_sds_calibrated',
        'sel': 'proxy_sel',
        'sel_calibrated': 'proxy_sel_calibrated'
    }
    
    # Determine which databases to process
    if args.database == 'all':
        targets = list(database_configs.keys())
    else:
        targets = [args.database]
    
    print("🚀 Starting outreach table setup...")
    print(f"📋 Target databases: {', '.join([database_configs[t] for t in targets])}")
    print("=" * 60)
    
    success_count = 0
    total_count = len(targets)
    
    for target in targets:
        database_name = database_configs[target]
        
        print(f"\n🔄 Processing {target} ({database_name})...")
        
        # Create table if requested
        if args.create_tables:
            if not create_outreach_table(database_name):
                print(f"❌ Failed to create table in {database_name}")
                continue
        
        # Import data
        if args.copy_from_proxy:
            # Copy from proxy database
            if copy_from_proxy_database(database_name):
                success_count += 1
        elif args.csv_file:
            # Import from CSV file
            if import_csv_to_database(args.csv_file, database_name):
                success_count += 1
        else:
            # Default: copy from proxy database
            if copy_from_proxy_database(database_name):
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
