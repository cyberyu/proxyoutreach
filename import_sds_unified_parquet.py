#!/usr/bin/env python3
"""
Unified SDS Account Data Parquet Import Tool
- Handles both account_voted and account_unvoted parquet files
- Uses chunked parquet reading for memory efficiency
- LOAD DATA INFILE for maximum performance
- Bulk operations with large batch sizes
- Optimized data types and memory usage
- Progress tracking and resume capability
- Handles 35GB+ parquet files with 767M+ records
"""

import pandas as pd
import pyarrow.parquet as pq
import mysql.connector
import os
import sys
import time
import tempfile
import numpy as np
import argparse
from mysql.connector import Error

def connect_to_mysql():
    """Connect to MySQL database with optimized settings"""
    try:
        print("🔍 Connecting to MySQL proxy_sds database...")
        
        # Try webapp user first (most likely to work)
        try:
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy_sds',
                user='webapp',
                password='webapppass',
                # Performance optimizations
                autocommit=False,
                use_unicode=True,
                charset='utf8mb4',
                sql_mode='',
                # Increase timeouts for large operations
                connect_timeout=60,
                # Optimize for bulk operations
                raise_on_warnings=False
            )
            print("✅ Connected as webapp user")
            return connection
        except Error as e:
            print(f"❌ webapp connection failed: {e}")
        
        # Fallback to root with password
        try:
            import getpass
            password = getpass.getpass("Enter MySQL root password: ")
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy_sds',
                user='root',
                password=password,
                autocommit=False,
                use_unicode=True,
                charset='utf8mb4',
                sql_mode='',
                connect_timeout=60,
                raise_on_warnings=False
            )
            print("✅ Connected as root user")
            return connection
        except Error as e:
            print(f"❌ root connection failed: {e}")
        
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def optimize_mysql_settings(connection):
    """Optimize MySQL settings for bulk import"""
    try:
        cursor = connection.cursor()
        
        print("⚙️ Optimizing MySQL settings for bulk import...")
        
        # Optimization queries
        optimizations = [
            "SET SESSION innodb_buffer_pool_size = @@innodb_buffer_pool_size",
            "SET SESSION bulk_insert_buffer_size = 256*1024*1024",  # 256MB
            "SET SESSION myisam_sort_buffer_size = 512*1024*1024",   # 512MB
            "SET SESSION key_buffer_size = 512*1024*1024",           # 512MB
            "SET SESSION sort_buffer_size = 64*1024*1024",           # 64MB
            "SET SESSION read_buffer_size = 32*1024*1024",           # 32MB
            "SET SESSION read_rnd_buffer_size = 32*1024*1024",       # 32MB
            "SET SESSION max_heap_table_size = 1024*1024*1024",      # 1GB
            "SET SESSION tmp_table_size = 1024*1024*1024",           # 1GB
            "SET foreign_key_checks = 0",
            "SET unique_checks = 0",
            "SET sql_log_bin = 0",
            "SET autocommit = 0"
        ]
        
        for query in optimizations:
            try:
                cursor.execute(query)
                print(f"  ✅ {query}")
            except Error as e:
                print(f"  ⚠️ Skipped: {query} ({e})")
        
        print("✅ MySQL optimization completed")
        return True
        
    except Exception as e:
        print(f"⚠️ Warning: Could not optimize all settings: {e}")
        return False

def restore_mysql_settings(connection):
    """Restore MySQL settings after import"""
    try:
        cursor = connection.cursor()
        print("🔄 Restoring MySQL settings...")
        
        restore_queries = [
            "SET foreign_key_checks = 1",
            "SET unique_checks = 1",
            "SET sql_log_bin = 1",
            "SET autocommit = 1"
        ]
        
        for query in restore_queries:
            try:
                cursor.execute(query)
            except Error:
                pass
        
        print("✅ MySQL settings restored")
        
    except Exception as e:
        print(f"⚠️ Warning restoring settings: {e}")

def get_current_record_count(connection, table_name):
    """Get current record count in the specified table"""
    try:
        cursor = connection.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        print(f"❌ Error getting record count for {table_name}: {e}")
        return 0

def get_parquet_info(parquet_file):
    """Get parquet file information"""
    try:
        pf = pq.ParquetFile(parquet_file)
        total_rows = pf.metadata.num_rows
        num_row_groups = pf.num_row_groups
        
        print(f"📊 Parquet file info:")
        print(f"  Total rows: {total_rows:,}")
        print(f"  Row groups: {num_row_groups}")
        print(f"  Columns: {len(pf.schema_arrow)}")
        
        return total_rows, num_row_groups, pf
    except Exception as e:
        print(f"❌ Error reading parquet file: {e}")
        return 0, 0, None

def get_table_config(table_name):
    """Get table-specific configuration"""
    if table_name == "account_voted":
        return {
            "insert_query": """
                INSERT INTO account_voted 
                (account_hash_key, proposal_master_skey, director_master_skey,
                 account_type, shares_summable, rank_of_shareholding,
                 score_model2, prediction_model2, Target_encoded)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            "load_data_columns": """
                (account_hash_key, proposal_master_skey, director_master_skey,
                 account_type, shares_summable, rank_of_shareholding,
                 score_model2, prediction_model2, Target_encoded)
            """,
            "score_field": "score_model2",
            "prediction_field": "prediction_model2"
        }
    elif table_name == "account_unvoted":
        return {
            "insert_query": """
                INSERT INTO account_unvoted 
                (account_hash_key, proposal_master_skey, director_master_skey,
                 account_type, shares_summable, rank_of_shareholding,
                 score_model1, prediction_model1, Target_encoded)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            "load_data_columns": """
                (account_hash_key, proposal_master_skey, director_master_skey,
                 account_type, shares_summable, rank_of_shareholding,
                 score_model1, prediction_model1, Target_encoded)
            """,
            "score_field": "score_model1",
            "prediction_field": "prediction_model1"
        }
    else:
        raise ValueError(f"Unknown table name: {table_name}")

def process_dataframe_chunk(df, table_name):
    """Process and clean a dataframe chunk for MySQL insertion"""
    try:
        config = get_table_config(table_name)
        
        # Handle NaN and infinite values
        df = df.replace([np.inf, -np.inf], None)
        df = df.where(pd.notnull(df), None)
        
        # Convert data types to match MySQL schema
        processed_data = []
        for _, row in df.iterrows():
            processed_row = [
                row['account_hash_key'] if pd.notnull(row['account_hash_key']) else None,
                int(row['proposal_master_skey']) if pd.notnull(row['proposal_master_skey']) else None,
                int(row['director_master_skey']) if pd.notnull(row['director_master_skey']) else None,
                row['account_type'] if pd.notnull(row['account_type']) else None,
                float(row['shares_summable']) if pd.notnull(row['shares_summable']) else None,
                int(row['rank_of_shareholding']) if pd.notnull(row['rank_of_shareholding']) else None,
                float(row[config['score_field']]) if pd.notnull(row[config['score_field']]) else None,
                int(row[config['prediction_field']]) if pd.notnull(row[config['prediction_field']]) else None,
                int(row['Target_encoded']) if pd.notnull(row['Target_encoded']) else None
            ]
            processed_data.append(processed_row)
        
        return processed_data
    except Exception as e:
        print(f"❌ Error processing dataframe chunk: {e}")
        return []

def import_parquet_with_load_data(connection, parquet_file, table_name, skip_row_groups=0):
    """Use LOAD DATA INFILE for maximum performance with parquet chunks"""
    try:
        cursor = connection.cursor()
        config = get_table_config(table_name)
        
        # Check if LOAD DATA INFILE is enabled
        cursor.execute("SHOW VARIABLES LIKE 'local_infile'")
        result = cursor.fetchone()
        if not result or result[1] != 'ON':
            print("⚠️ local_infile is disabled, using batch insert method...")
            return import_parquet_with_batch_insert(connection, parquet_file, table_name, skip_row_groups)
        
        print(f"🚀 Using LOAD DATA INFILE with chunked parquet reading...")
        
        total_rows, num_row_groups, pf = get_parquet_info(parquet_file)
        if not pf:
            return 0
        
        if skip_row_groups >= num_row_groups:
            print("ℹ️ All row groups already processed")
            return 0
        
        total_imported = 0
        start_time = time.time()
        
        # Process row groups in chunks
        for row_group_idx in range(skip_row_groups, num_row_groups):
            try:
                print(f"📦 Processing row group {row_group_idx + 1}/{num_row_groups}...")
                
                # Read row group
                table = pf.read_row_group(row_group_idx)
                df = table.to_pandas()
                
                if df.empty:
                    continue
                
                # Create temporary CSV file for this chunk
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as temp_file:
                    temp_file_path = temp_file.name
                    
                    # Convert dataframe to CSV format
                    df_processed = df.copy()
                    # Handle NaN values
                    df_processed = df_processed.where(pd.notnull(df_processed), '')
                    
                    # Write to CSV without header
                    df_processed.to_csv(temp_file_path, index=False, header=False, 
                                      na_rep='', quoting=1)  # quoting=1 means QUOTE_ALL
                
                # Execute LOAD DATA INFILE
                load_query = f"""
                LOAD DATA LOCAL INFILE '{temp_file_path}'
                INTO TABLE {table_name}
                FIELDS TERMINATED BY ','
                ENCLOSED BY '"'
                LINES TERMINATED BY '\\n'
                {config['load_data_columns']}
                """
                
                cursor.execute(load_query)
                connection.commit()
                
                chunk_size = len(df)
                total_imported += chunk_size
                
                # Clean up temp file
                os.unlink(temp_file_path)
                
                # Progress update
                elapsed = time.time() - start_time
                rate = total_imported / elapsed if elapsed > 0 else 0
                progress = ((row_group_idx + 1) / num_row_groups) * 100
                
                print(f"  ✅ Imported {chunk_size:,} records ({total_imported:,} total)")
                print(f"  📈 Progress: {progress:.1f}% - {rate:,.0f} rec/sec")
                print()
                
            except Exception as e:
                print(f"  ❌ Error processing row group {row_group_idx + 1}: {e}")
                # Clean up temp file if it exists
                if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                continue
        
        elapsed = time.time() - start_time
        rate = total_imported / elapsed if elapsed > 0 else 0
        
        print(f"✅ LOAD DATA INFILE completed!")
        print(f"⏱️ Time: {elapsed:.1f}s")
        print(f"🏃 Rate: {rate:,.0f} records/second")
        
        return total_imported
        
    except Exception as e:
        print(f"❌ LOAD DATA INFILE failed: {e}")
        print("🔄 Falling back to batch insert method...")
        return import_parquet_with_batch_insert(connection, parquet_file, table_name, skip_row_groups)

def import_parquet_with_batch_insert(connection, parquet_file, table_name, skip_row_groups=0):
    """Optimized batch insert with chunked parquet reading"""
    try:
        cursor = connection.cursor()
        config = get_table_config(table_name)
        
        print(f"📥 Using optimized batch insert with chunked parquet reading...")
        
        total_rows, num_row_groups, pf = get_parquet_info(parquet_file)
        if not pf:
            return 0
        
        if skip_row_groups >= num_row_groups:
            print("ℹ️ All row groups already processed")
            return 0
        
        batch_size = 5000  # Smaller batches for parquet processing
        total_imported = 0
        start_time = time.time()
        
        # Process row groups in chunks
        for row_group_idx in range(skip_row_groups, num_row_groups):
            try:
                print(f"📦 Processing row group {row_group_idx + 1}/{num_row_groups}...")
                
                # Read row group
                table = pf.read_row_group(row_group_idx)
                df = table.to_pandas()
                
                if df.empty:
                    continue
                
                # Process dataframe in smaller batches
                processed_data = process_dataframe_chunk(df, table_name)
                
                # Insert in batches
                for i in range(0, len(processed_data), batch_size):
                    batch = processed_data[i:i + batch_size]
                    cursor.executemany(config['insert_query'], batch)
                    connection.commit()
                    total_imported += len(batch)
                
                # Progress update
                elapsed = time.time() - start_time
                rate = total_imported / elapsed if elapsed > 0 else 0
                progress = ((row_group_idx + 1) / num_row_groups) * 100
                
                print(f"  ✅ Imported {len(df):,} records ({total_imported:,} total)")
                print(f"  📈 Progress: {progress:.1f}% - {rate:,.0f} rec/sec")
                print()
                
            except Exception as e:
                print(f"  ❌ Error processing row group {row_group_idx + 1}: {e}")
                continue
        
        elapsed = time.time() - start_time
        rate = total_imported / elapsed if elapsed > 0 else 0
        
        print(f"✅ Batch insert completed!")
        print(f"⏱️ Time: {elapsed:.1f}s")
        print(f"🏃 Rate: {rate:,.0f} records/second")
        
        return total_imported
        
    except Error as e:
        print(f"❌ MySQL Error: {e}")
        return 0
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 0

def calculate_resume_point(connection, parquet_file, table_name):
    """Calculate which row group to resume from based on current record count"""
    try:
        current_count = get_current_record_count(connection, table_name)
        total_rows, num_row_groups, pf = get_parquet_info(parquet_file)
        
        if current_count == 0:
            return 0  # Start from beginning
        
        if not pf:
            return 0
        
        # Estimate which row group to start from
        # This is approximate since row groups may have different sizes
        processed_row_groups = 0
        cumulative_rows = 0
        
        for i in range(num_row_groups):
            row_group_rows = pf.metadata.row_group(i).num_rows
            if cumulative_rows + row_group_rows > current_count:
                break
            cumulative_rows += row_group_rows
            processed_row_groups += 1
        
        print(f"📊 Resume calculation for {table_name}:")
        print(f"  Current records: {current_count:,}")
        print(f"  Estimated processed row groups: {processed_row_groups}/{num_row_groups}")
        print(f"  Estimated processed rows: {cumulative_rows:,}")
        
        return processed_row_groups
        
    except Exception as e:
        print(f"❌ Error calculating resume point: {e}")
        return 0

def process_single_file(connection, parquet_file, table_name):
    """Process a single parquet file import"""
    print(f"\n{'='*60}")
    print(f"📁 Processing: {parquet_file}")
    print(f"🎯 Target table: {table_name}")
    print(f"{'='*60}")
    
    # Check if parquet file exists
    if not os.path.exists(parquet_file):
        print(f"❌ File {parquet_file} not found")
        return False
    
    # Get file size
    file_size = os.path.getsize(parquet_file)
    print(f"📊 File size: {file_size / (1024**3):.2f} GB")
    
    # Check current record count and calculate resume point
    current_count = get_current_record_count(connection, table_name)
    print(f"📊 Current records in {table_name}: {current_count:,}")
    
    # Get parquet info
    total_rows, num_row_groups, pf = get_parquet_info(parquet_file)
    if not pf:
        return False
    
    if current_count >= total_rows:
        print(f"✅ All records already imported in {table_name}!")
        return True
    
    remaining = total_rows - current_count
    print(f"📊 Remaining to import: {remaining:,}")
    
    # Calculate resume point
    skip_row_groups = calculate_resume_point(connection, parquet_file, table_name)
    
    print("")
    
    # Start import
    start_time = time.time()
    
    # Try LOAD DATA INFILE first, fall back to batch insert
    imported_count = import_parquet_with_load_data(connection, parquet_file, table_name, skip_row_groups)
    
    # Final statistics
    elapsed = time.time() - start_time
    final_count = get_current_record_count(connection, table_name)
    
    print("")
    print(f"🎉 Import completed for {table_name}!")
    print(f"📊 Records imported this session: {imported_count:,}")
    print(f"📊 Total records in {table_name}: {final_count:,}")
    print(f"⏱️ Total time: {elapsed:.1f}s")
    if imported_count > 0:
        print(f"🏃 Average rate: {imported_count / elapsed:,.0f} records/second")
    
    if final_count < total_rows:
        remaining = total_rows - final_count
        print(f"⚠️ Still {remaining:,} records remaining in {table_name}")
        return False
    else:
        print(f"✅ All records successfully imported to {table_name}!")
        return True

def main():
    parser = argparse.ArgumentParser(description='Import SDS Account Data from Parquet files')
    parser.add_argument('--table', choices=['voted', 'unvoted', 'both'], default='both',
                       help='Which table(s) to import: voted, unvoted, or both (default: both)')
    parser.add_argument('--voted-file', default='df_2025_sds_167_account_voted_sorted.parquet',
                       help='Path to account_voted parquet file')
    parser.add_argument('--unvoted-file', default='df_2025_sds_167_account_unvoted_sorted.parquet',
                       help='Path to account_unvoted parquet file')
    
    args = parser.parse_args()
    
    print("=== UNIFIED SDS Account Data Parquet Import Tool ===")
    print("🎯 Target: Parquet files → proxy_sds.account_voted & account_unvoted")
    print("🚀 Optimizations: Chunked parquet reading, LOAD DATA INFILE, large batches")
    print("")
    
    # Connect to database
    connection = connect_to_mysql()
    if not connection:
        print("❌ Could not connect to database")
        sys.exit(1)
    
    try:
        # Optimize MySQL settings
        optimize_mysql_settings(connection)
        
        success = True
        
        # Process files based on user selection
        if args.table in ['voted', 'both']:
            print(f"\n🗳️ Processing VOTED accounts...")
            if not process_single_file(connection, args.voted_file, 'account_voted'):
                success = False
        
        if args.table in ['unvoted', 'both']:
            print(f"\n🚫 Processing UNVOTED accounts...")
            if not process_single_file(connection, args.unvoted_file, 'account_unvoted'):
                success = False
        
        # Restore MySQL settings
        restore_mysql_settings(connection)
        
        print(f"\n{'='*60}")
        if success:
            print("🎉 ALL IMPORTS COMPLETED SUCCESSFULLY!")
        else:
            print("⚠️ Some imports incomplete - run again to resume")
        print(f"{'='*60}")
        
    finally:
        connection.close()

if __name__ == "__main__":
    main()