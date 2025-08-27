#!/usr/bin/env python3
"""
Unified Parquet Import Tool for proxy_sel Database
Imports account_voted and account_unvoted parquet files into the proxy_sel database
"""

import os
import sys
import pandas as pd
import mysql.connector
from datetime import datetime
import math

def get_db_connection():
    """Create database connection to proxy_sel with fallback options"""
    try:
        print("🔍 Connecting to MySQL proxy_sel database...")
        
        # Try different connection methods
        connection_configs = [
            {
                'host': 'localhost',
                'user': 'webapp',
                'password': 'webapppass',
                'database': 'proxy_sel'
            },
            {
                'host': 'localhost',
                'user': 'root',
                'password': '',
                'database': 'proxy_sel'
            }
        ]
        
        for config in connection_configs:
            try:
                if config['user'] == 'root' and config['password'] == '':
                    # Ask for root password
                    import getpass
                    password = getpass.getpass("Enter MySQL root password (or press Enter if no password): ")
                    config['password'] = password
                
                connection = mysql.connector.connect(**config)
                print(f"✅ Connected as {config['user']}")
                return connection
                
            except mysql.connector.Error as e:
                print(f"❌ Failed to connect as {config['user']}: {e}")
                continue
        
        print("❌ All connection attempts failed")
        return None
        
    except Exception as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def validate_and_clean_data(df, table_name):
    """Validate and clean the dataframe before import"""
    print(f"📊 Original data shape: {df.shape}")
    print(f"📝 Columns: {list(df.columns)}")
    
    # Define expected columns for proxy_sel tables
    expected_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 
        'score_model2', 'prediction_model2', 'Target_encoded'
    ]
    
    # For account_unvoted, Target_encoded might not be present
    if table_name == 'account_unvoted':
        # Target_encoded is optional for unvoted accounts
        pass
    
    # Check if all expected columns exist and try to map variations
    missing_columns = [col for col in expected_columns if col not in df.columns]
    if missing_columns:
        print(f"⚠️ Missing columns: {missing_columns}")
        print(f"Available columns: {list(df.columns)}")
        
        # Try to map columns with different names
        column_mapping = {}
        
        # Common variations to check
        column_variations = {
            'score_model2': ['score_model1', 'score', 'score_model'],
            'prediction_model2': ['prediction_model1', 'prediction', 'prediction_model'],
            'Target_encoded': ['true_outcome', 'target', 'outcome', 'Target']
        }
        
        for expected_col in missing_columns:
            if expected_col in column_variations:
                for variant in column_variations[expected_col]:
                    if variant in df.columns:
                        column_mapping[variant] = expected_col
                        print(f"🔄 Mapping {variant} -> {expected_col}")
                        break
        
        if column_mapping:
            df = df.rename(columns=column_mapping)
            # Recheck missing columns after mapping
            missing_columns = [col for col in expected_columns if col not in df.columns]
    
    # Select only the columns we have and need
    available_columns = [col for col in expected_columns if col in df.columns]
    df = df[available_columns]
    
    print(f"📋 Using columns: {available_columns}")
    
    # Handle missing values and data type conversions
    for col in df.columns:
        if col in ['proposal_master_skey', 'director_master_skey', 'rank_of_shareholding', 'shares_summable', 'Target_encoded']:
            # Convert to integer, handling NaN values and float precision issues
            df[col] = pd.to_numeric(df[col], errors='coerce')
            # Round to handle floating point precision issues, then convert to int
            df[col] = df[col].round().fillna(0).astype(int)
            
        elif col in ['score_model2', 'prediction_model2']:
            # Convert to float, handling NaN values
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        elif col == 'account_hash_key':
            # Ensure string type and handle missing values
            df[col] = df[col].astype(str).replace('nan', '')
            df[col] = df[col].replace('None', '')
            
        elif col == 'account_type':
            # Ensure string type
            df[col] = df[col].astype(str).replace('nan', '')
            df[col] = df[col].replace('None', '')
    
    # Remove rows where account_hash_key is empty
    df = df[df['account_hash_key'].str.strip() != '']
    
    print(f"📊 Cleaned data shape: {df.shape}")
    return df

def import_parquet_to_table(connection, parquet_file, table_name):
    """Import parquet data to specified table (account_voted or account_unvoted)"""
    try:
        cursor = connection.cursor()
        
        # Check if file exists
        if not os.path.exists(parquet_file):
            print(f"❌ File {parquet_file} not found")
            return 0
        
        print(f"📥 Loading parquet file: {parquet_file}")
        print(f"🎯 Target table: {table_name}")
        
        # Load parquet file
        df = pd.read_parquet(parquet_file)
        
        # Validate and clean data
        df = validate_and_clean_data(df, table_name)
        
        if df.empty:
            print("❌ No valid data to import after cleaning")
            return 0
        
        # Clear existing data (optional - comment out if you want to append)
        print(f"🗑️ Clearing existing data in {table_name} table...")
        cursor.execute(f"DELETE FROM {table_name}")
        connection.commit()
        
        # Define columns for insertion (excluding auto-increment id and created_at)
        columns = [col for col in df.columns if col in [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding', 
            'score_model2', 'prediction_model2', 'Target_encoded'
        ]]
        
        # Prepare the INSERT statement
        placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        
        print(f"📝 Insert query: {insert_query}")
        print(f"📊 Importing {len(df)} records...")
        
        # Convert DataFrame to list of tuples for batch insert
        batch_size = 1000
        imported_count = 0
        
        for i in range(0, len(df), batch_size):
            batch_df = df.iloc[i:i+batch_size]
            
            # Convert to list of tuples, handling None values properly
            batch_data = []
            for _, row in batch_df.iterrows():
                row_data = []
                for col in columns:
                    value = row[col]
                    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
                        row_data.append(None)
                    else:
                        # Convert to appropriate Python type
                        if col in ['proposal_master_skey', 'director_master_skey', 'rank_of_shareholding', 'shares_summable', 'Target_encoded']:
                            row_data.append(int(value) if not pd.isna(value) else None)
                        else:
                            row_data.append(value)
                batch_data.append(tuple(row_data))
            
            # Execute batch insert
            cursor.executemany(insert_query, batch_data)
            connection.commit()
            
            imported_count += len(batch_data)
            print(f"📈 Progress: {imported_count}/{len(df)} records ({(imported_count/len(df)*100):.1f}%)")
        
        print(f"✅ Successfully imported {imported_count} records to {table_name} table")
        return imported_count
        
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        return 0
    finally:
        if cursor:
            cursor.close()

def main():
    """Main function"""
    print("=== Unified Parquet Import Tool for proxy_sel Database ===")
    print("🎯 Importing account_voted and account_unvoted parquet files")
    print("")
    
    # Default parquet file paths
    default_files = {
        'account_unvoted': './backups/df_2025_sel_666_account_unvoted_sorted.parquet',
        'account_voted': './backups/df_2025_sel_666_account_voted_sorted.parquet'
    }
    
    # Allow command line arguments to override file paths
    if len(sys.argv) >= 3:
        unvoted_file = sys.argv[1]
        voted_file = sys.argv[2]
        print(f"📁 Using command line arguments:")
        print(f"   Unvoted: {unvoted_file}")
        print(f"   Voted: {voted_file}")
    else:
        unvoted_file = default_files['account_unvoted']
        voted_file = default_files['account_voted']
        print(f"📁 Using default file paths:")
        print(f"   Unvoted: {unvoted_file}")
        print(f"   Voted: {voted_file}")
    
    # Check if files exist
    files_to_process = []
    
    if os.path.exists(unvoted_file):
        files_to_process.append((unvoted_file, 'account_unvoted'))
        print(f"✅ Found unvoted file: {unvoted_file}")
    else:
        print(f"❌ Unvoted file not found: {unvoted_file}")
    
    if os.path.exists(voted_file):
        files_to_process.append((voted_file, 'account_voted'))
        print(f"✅ Found voted file: {voted_file}")
    else:
        print(f"❌ Voted file not found: {voted_file}")
    
    if not files_to_process:
        print("❌ No parquet files found to process")
        print("")
        print("Usage:")
        print("  python3 import_proxy_sel_unified.py")
        print("  python3 import_proxy_sel_unified.py <unvoted_file.parquet> <voted_file.parquet>")
        sys.exit(1)
    
    print("")
    
    # Connect to database
    connection = get_db_connection()
    if not connection:
        sys.exit(1)
    
    try:
        total_imported = 0
        
        # Process each file
        for file_path, table_name in files_to_process:
            print(f"{'='*60}")
            print(f"📋 Processing: {os.path.basename(file_path)} -> {table_name}")
            print(f"{'='*60}")
            
            imported_count = import_parquet_to_table(connection, file_path, table_name)
            total_imported += imported_count
            
            print("")
        
        # Final verification
        print(f"{'='*60}")
        print("🔍 FINAL VERIFICATION")
        print(f"{'='*60}")
        
        cursor = connection.cursor()
        
        # Get table counts
        cursor.execute("SELECT COUNT(*) FROM account_unvoted")
        unvoted_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM account_voted")
        voted_count = cursor.fetchone()[0]
        
        print(f"📊 Final database statistics:")
        print(f"   account_unvoted: {unvoted_count:,} records")
        print(f"   account_voted: {voted_count:,} records")
        print(f"   Total records: {unvoted_count + voted_count:,}")
        print("")
        
        if total_imported > 0:
            print("🎉 Import completed successfully!")
            print(f"   Total records imported: {total_imported:,}")
            
            # Show sample data
            if unvoted_count > 0:
                print("\n🔍 Sample data from account_unvoted:")
                cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_unvoted LIMIT 3")
                for row in cursor.fetchall():
                    print(f"   {row}")
            
            if voted_count > 0:
                print("\n🔍 Sample data from account_voted:")
                cursor.execute("SELECT account_hash_key, account_type, shares_summable, prediction_model2 FROM account_voted LIMIT 3")
                for row in cursor.fetchall():
                    print(f"   {row}")
        else:
            print("❌ Import failed or no records imported")
            sys.exit(1)
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        connection.close()
        print("\n🔐 Database connection closed")

if __name__ == "__main__":
    main()
