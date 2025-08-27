#!/usr/bin/env python3
"""
Import df_2025_sel_666_account_voted_sorted.parquet into proxy_sel.account_voted table
"""

import pandas as pd
import mysql.connector
import sys
import os
from datetime import datetime
import math

def connect_to_database():
    """Connect to MySQL database"""
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

def validate_and_clean_data(df):
    """Validate and clean the dataframe before import"""
    print(f"📊 Original data shape: {df.shape}")
    print(f"📝 Columns: {list(df.columns)}")
    
    # Define expected columns
    expected_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 
        'score_model2', 'prediction_model2', 'Target_encoded'
    ]
    
    # Check if all expected columns exist
    missing_columns = [col for col in expected_columns if col not in df.columns]
    if missing_columns:
        print(f"⚠️ Missing columns: {missing_columns}")
        print(f"Available columns: {list(df.columns)}")
        
        # If columns have different names, try to map them
        column_mapping = {}
        for expected_col in expected_columns:
            for actual_col in df.columns:
                if expected_col.lower() in actual_col.lower() or actual_col.lower() in expected_col.lower():
                    column_mapping[actual_col] = expected_col
                    break
        
        if column_mapping:
            print(f"🔄 Column mapping: {column_mapping}")
            df = df.rename(columns=column_mapping)
    
    # Select only the columns we need
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

def import_parquet_to_account_voted(connection, parquet_file):
    """Import parquet data to proxy_sel.account_voted table"""
    try:
        cursor = connection.cursor()
        
        # Check if file exists
        if not os.path.exists(parquet_file):
            print(f"❌ File {parquet_file} not found")
            return 0
        
        print(f"📥 Loading parquet file: {parquet_file}")
        
        # Load parquet file
        df = pd.read_parquet(parquet_file)
        
        # Validate and clean data
        df = validate_and_clean_data(df)
        
        if df.empty:
            print("❌ No valid data to import after cleaning")
            return 0
        
        # Clear existing data (optional - comment out if you want to append)
        print("🗑️ Clearing existing data in account_voted table...")
        cursor.execute("DELETE FROM account_voted")
        connection.commit()
        
        # Define columns for insertion (excluding auto-increment id and created_at)
        columns = [col for col in df.columns if col in [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding', 
            'score_model2', 'prediction_model2', 'Target_encoded'
        ]]
        
        # Prepare the INSERT statement
        placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO account_voted ({', '.join(columns)}) VALUES ({placeholders})"
        
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
        
        print(f"✅ Successfully imported {imported_count} records to account_voted table")
        return imported_count
        
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        if cursor:
            cursor.close()

def main():
    """Main function"""
    print("🚀 Starting proxy_sel account_voted import process...")
    
    # Default parquet file path
    parquet_file = "./backups/df_2025_sel_666_account_voted_sorted.parquet"
    
    # Allow command line argument for file path
    if len(sys.argv) > 1:
        parquet_file = sys.argv[1]
    
    print(f"📁 Parquet file: {parquet_file}")
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        sys.exit(1)
    
    try:
        # Import data
        imported_count = import_parquet_to_account_voted(connection, parquet_file)
        
        if imported_count > 0:
            print(f"🎉 Import completed successfully!")
            print(f"📊 Total records imported: {imported_count}")
        else:
            print("❌ Import failed or no records imported")
            sys.exit(1)
            
    finally:
        connection.close()
        print("🔐 Database connection closed")

if __name__ == "__main__":
    main()
