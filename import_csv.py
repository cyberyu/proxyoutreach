#!/usr/bin/env python3

import csv
import mysql.connector
import os
import sys
from mysql.connector import Error

def connect_to_mysql():
    """Connect to MySQL database"""
    try:
        # For Ubuntu/Debian with auth_socket, we need to run as root
        # Let's try a simpler approach using subprocess with sudo mysql
        import subprocess
        import tempfile
        import json
        
        print("🔍 Testing MySQL connection methods...")
        
        # Test if we can connect with sudo mysql
        try:
            result = subprocess.run([
                'sudo', 'mysql', '-u', 'root', '-e', 'SELECT 1;'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print("✅ MySQL auth_socket method detected")
                return "sudo_mysql"
            else:
                print(f"❌ sudo mysql failed: {result.stderr}")
        except Exception as e:
            print(f"❌ sudo mysql test failed: {e}")
        
        # If sudo mysql doesn't work, fall back to regular connection
        try:
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy',
                user='root'
            )
            print("✅ Connected without password")
            return connection
        except Error:
            # Ask for password
            import getpass
            password = getpass.getpass("Enter MySQL password: ")
            connection = mysql.connector.connect(
                host='localhost',
                database='proxy',
                user='root',
                password=password
            )
            print("✅ Connected with password")
            return connection
        
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def import_csv_to_table(connection, csv_file, table_name, columns):
    """Import CSV data to MySQL table"""
    try:
        cursor = connection.cursor()
        
        # Check if file exists
        if not os.path.exists(csv_file):
            print(f"⚠️  Warning: {csv_file} not found")
            return 0
        
        print(f"📥 Importing {csv_file} to {table_name}...")
        
        # Prepare the INSERT statement
        placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        
        imported_count = 0
        batch_size = 1000
        batch_data = []
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Skip the header row
            next(file)
            
            csv_reader = csv.reader(file)
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Handle empty or incomplete rows
                    if len(row) < len(columns):
                        row.extend([''] * (len(columns) - len(row)))
                    
                    # Convert data types
                    processed_row = []
                    for i, value in enumerate(row[:len(columns)]):
                        if value == '' or value is None:
                            processed_row.append(None)
                        else:
                            # Convert to appropriate type based on column
                            if i in [0, 2, 3, 6]:  # row_index, proposal_master_skey, director_master_skey, rank_of_shareholding
                                try:
                                    processed_row.append(int(float(value)) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif i in [5]:  # shares_summable
                                try:
                                    processed_row.append(float(value) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif i in [7, 8]:  # score_model, prediction_model
                                try:
                                    if i == 8:  # prediction_model (TINYINT)
                                        processed_row.append(int(float(value)) if value else 0)
                                    else:  # score_model (DECIMAL)
                                        processed_row.append(float(value) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None if i == 7 else 0)
                            else:
                                processed_row.append(str(value) if value else None)
                    
                    batch_data.append(processed_row)
                    
                    # Insert in batches
                    if len(batch_data) >= batch_size:
                        cursor.executemany(insert_query, batch_data)
                        connection.commit()
                        imported_count += len(batch_data)
                        batch_data = []
                        print(f"  Imported {imported_count} records...")
                
                except Exception as e:
                    print(f"  Warning: Skipping row {row_num} due to error: {e}")
                    continue
            
            # Insert remaining batch
            if batch_data:
                cursor.executemany(insert_query, batch_data)
                connection.commit()
                imported_count += len(batch_data)
        
        print(f"✅ Successfully imported {imported_count} records to {table_name}")
        return imported_count
        
    except Error as e:
        print(f"❌ Error importing {csv_file}: {e}")
        return 0
    except Exception as e:
        print(f"❌ Unexpected error importing {csv_file}: {e}")
        return 0

def main():
    print("=== CSV Import Tool for Proxy Database ===")
    print("")
    
    # Connect to database
    connection = connect_to_mysql()
    if not connection:
        print("❌ Could not connect to database")
        sys.exit(1)
    
    print("")
    
    # Define table columns (excluding auto-increment id)
    unvoted_columns = [
        'row_index', 'unnamed_col', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model1', 'prediction_model1'
    ]
    
    voted_columns = [
        'row_index', 'unnamed_col', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model2', 'prediction_model2'
    ]
    
    # Import CSV files
    total_imported = 0
    
    # Import unvoted accounts
    unvoted_count = import_csv_to_table(
        connection, 
        'df_2025_279_account_unvoted_sorted.csv', 
        'account_unvoted', 
        unvoted_columns
    )
    total_imported += unvoted_count
    
    print("")
    
    # Import voted accounts
    voted_count = import_csv_to_table(
        connection, 
        'df_2025_279_account_voted_sorted.csv', 
        'account_voted', 
        voted_columns
    )
    total_imported += voted_count
    
    # Close connection
    connection.close()
    
    print("")
    print("🎉 Import completed!")
    print(f"📊 Total records imported: {total_imported}")
    print("")
    print("📝 Verify with these commands:")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_unvoted;'")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_voted;'")
    print("")

if __name__ == "__main__":
    main()
