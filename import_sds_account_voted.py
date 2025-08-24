#!/usr/bin/env python3

import csv
import mysql.connector
import os
import sys
from mysql.connector import Error

def connect_to_mysql():
    """Connect to MySQL database"""
    try:
        print("🔍 Connecting to MySQL proxy_sds database...")
        
        # Try connection with password first
        try:
            import getpass
            password = getpass.getpass("Enter MySQL password: ")
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy_sds',
                user='root',
                password=password
            )
            print("✅ Connected with password")
            return connection
        except Error as e:
            print(f"❌ Error connecting with password: {e}")
        
        # Try without password as fallback
        try:
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy_sds',
                user='root'
            )
            print("✅ Connected without password")
            return connection
        except Error as e:
            print(f"❌ Error connecting without password: {e}")
        
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def import_csv_to_account_voted(connection, csv_file):
    """Import CSV data to proxy_sds.account_voted table"""
    try:
        cursor = connection.cursor()
        
        # Check if file exists
        if not os.path.exists(csv_file):
            print(f"❌ File {csv_file} not found")
            return 0
        
        print(f"📥 Importing {csv_file} to proxy_sds.account_voted...")
        
        # Define columns (excluding auto-increment id and created_at)
        columns = [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding', 
            'score_model2', 'prediction_model2', 'Target_encoded'
        ]
        
        # Prepare the INSERT statement
        placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO account_voted ({', '.join(columns)}) VALUES ({placeholders})"
        
        imported_count = 0
        batch_size = 1000  # Process in batches to manage memory
        batch_data = []
        
        # Get file size for progress tracking
        file_size = os.path.getsize(csv_file)
        print(f"📊 File size: {file_size / (1024**3):.2f} GB")
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Skip the header row
            header = next(file)
            print(f"📝 CSV Header: {header.strip()}")
            
            csv_reader = csv.reader(file)
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Handle empty or incomplete rows
                    if len(row) < len(columns):
                        row.extend([''] * (len(columns) - len(row)))
                    
                    # Convert data types based on column structure
                    processed_row = []
                    for i, value in enumerate(row[:len(columns)]):
                        if value == '' or value is None:
                            processed_row.append(None)
                        else:
                            col_name = columns[i]
                            # Convert to appropriate type based on column name
                            if col_name in ['proposal_master_skey', 'director_master_skey', 'rank_of_shareholding']:
                                try:
                                    processed_row.append(int(float(value)) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif col_name in ['shares_summable', 'score_model2']:
                                try:
                                    processed_row.append(float(value) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif col_name in ['prediction_model2']:
                                try:
                                    processed_row.append(int(float(value)) if value else 0)
                                except (ValueError, TypeError):
                                    processed_row.append(0)
                            elif col_name in ['Target_encoded']:
                                try:
                                    processed_row.append(int(float(value)) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            else:  # String columns: account_hash_key, account_type
                                processed_row.append(str(value) if value else None)
                    
                    batch_data.append(processed_row)
                    
                    # Insert in batches
                    if len(batch_data) >= batch_size:
                        cursor.executemany(insert_query, batch_data)
                        connection.commit()
                        imported_count += len(batch_data)
                        batch_data = []
                        print(f"  📈 Imported {imported_count} records...")
                        
                        # Progress update every 100k records
                        if imported_count % 100000 == 0:
                            print(f"  🎯 Milestone: {imported_count:,} records imported")
                
                except Exception as e:
                    print(f"  ⚠️  Warning: Skipping row {row_num} due to error: {e}")
                    continue
            
            # Insert remaining batch
            if batch_data:
                cursor.executemany(insert_query, batch_data)
                connection.commit()
                imported_count += len(batch_data)
        
        print(f"✅ Successfully imported {imported_count:,} records to proxy_sds.account_voted")
        return imported_count
        
    except Error as e:
        print(f"❌ MySQL Error importing {csv_file}: {e}")
        return 0
    except Exception as e:
        print(f"❌ Unexpected error importing {csv_file}: {e}")
        return 0

def main():
    print("=== SDS Account Voted CSV Import Tool for proxy_sds Database ===")
    print("🎯 Target: df_2025_sds_167_account_voted_sorted.csv → proxy_sds.account_voted")
    print("")
    
    # Connect to database
    connection = connect_to_mysql()
    if not connection:
        print("❌ Could not connect to database")
        sys.exit(1)
    
    print("")
    
    # Check if table exists
    try:
        cursor = connection.cursor()
        cursor.execute("SHOW TABLES LIKE 'account_voted'")
        if not cursor.fetchone():
            print("❌ Table 'account_voted' does not exist in proxy_sds database")
            connection.close()
            sys.exit(1)
        
        # Check current record count
        cursor.execute("SELECT COUNT(*) FROM account_voted")
        current_count = cursor.fetchone()[0]
        print(f"📊 Current records in account_voted: {current_count:,}")
        
        if current_count > 0:
            response = input("⚠️  Table already contains data. Continue? (y/N): ")
            if response.lower() != 'y':
                print("❌ Import cancelled")
                connection.close()
                sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error checking table: {e}")
        connection.close()
        sys.exit(1)
    
    print("")
    
    # Import CSV file
    csv_file = 'df_2025_sds_167_account_voted_sorted.csv'
    imported_count = import_csv_to_account_voted(connection, csv_file)
    
    # Close connection
    connection.close()
    
    print("")
    print("🎉 Import completed!")
    print(f"📊 Records imported: {imported_count:,}")
    print("")
    print("📝 Verify with these commands:")
    print("  mysql -u root -p -e 'USE proxy_sds; SELECT COUNT(*) FROM account_voted;'")
    print("  mysql -u root -p -e 'USE proxy_sds; SELECT * FROM account_voted LIMIT 5;'")
    print("")

if __name__ == "__main__":
    main()
