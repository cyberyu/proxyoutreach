#!/usr/bin/env python3

import csv
import subprocess
import sys
import os

def run_mysql_command(sql_command):
    """Run MySQL command using sudo mysql"""
    try:
        process = subprocess.Popen(
            ['sudo', 'mysql', '-u', 'root', 'proxy'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=sql_command)
        
        if process.returncode != 0:
            print(f"❌ MySQL Error: {stderr}")
            return False
        return True
        
    except Exception as e:
        print(f"❌ Error running MySQL command: {e}")
        return False

def import_csv_file(csv_file, table_name, columns):
    """Import CSV file to MySQL table"""
    if not os.path.exists(csv_file):
        print(f"⚠️  Warning: {csv_file} not found")
        return 0
    
    print(f"📥 Importing {csv_file} to {table_name}...")
    
    imported_count = 0
    batch_size = 1000
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            next(csv_reader)  # Skip header
            
            batch_values = []
            
            for row_num, row in enumerate(csv_reader, 1):
                # Process each column
                processed_values = []
                
                for i in range(9):  # We need 9 columns
                    if i < len(row):
                        value = row[i].strip()
                    else:
                        value = ''
                    
                    if value == '' or value.lower() == 'null':
                        if i == 8:  # prediction_model (TINYINT, can't be NULL)
                            processed_values.append('0')
                        else:
                            processed_values.append('NULL')
                    elif i in [0, 2, 3, 6]:  # Integer columns
                        try:
                            int_val = int(float(value))
                            processed_values.append(str(int_val))
                        except (ValueError, TypeError):
                            processed_values.append('NULL')
                    elif i in [5, 7]:  # Decimal columns
                        try:
                            float_val = float(value)
                            processed_values.append(str(float_val))
                        except (ValueError, TypeError):
                            processed_values.append('NULL')
                    elif i == 8:  # prediction_model (TINYINT)
                        try:
                            int_val = int(float(value))
                            processed_values.append(str(int_val))
                        except (ValueError, TypeError):
                            processed_values.append('0')
                    else:  # String columns
                        escaped_value = value.replace("'", "''").replace('\\', '\\\\')
                        processed_values.append(f"'{escaped_value}'")
                
                # Add to batch
                values_str = '(' + ', '.join(processed_values) + ')'
                batch_values.append(values_str)
                
                # Execute batch when it reaches batch_size
                if len(batch_values) >= batch_size:
                    sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES " + ', '.join(batch_values) + ";"
                    
                    if run_mysql_command(sql):
                        imported_count += len(batch_values)
                        print(f"  Imported {imported_count} records...")
                        batch_values = []
                    else:
                        print(f"❌ Failed to import batch at row {row_num}")
                        return imported_count
            
            # Execute remaining batch
            if batch_values:
                sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES " + ', '.join(batch_values) + ";"
                
                if run_mysql_command(sql):
                    imported_count += len(batch_values)
                else:
                    print(f"❌ Failed to import final batch")
        
        print(f"✅ Successfully imported {imported_count} records to {table_name}")
        return imported_count
        
    except Exception as e:
        print(f"❌ Error processing {csv_file}: {e}")
        return imported_count

def main():
    print("=== Simple CSV Import for Proxy Database ===")
    print("")
    
    # Test MySQL connection
    print("🔍 Testing MySQL connection...")
    if not run_mysql_command("SELECT 1;"):
        print("❌ Cannot connect to MySQL database")
        sys.exit(1)
    
    print("✅ Connected to database: proxy")
    print("")
    
    # Define columns for each table
    unvoted_columns = [
        'row_index', 'unnamed_col', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model1', 'prediction_model1'
    ]
    
    voted_columns = [
        'row_index', 'unnamed_col', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model2', 'prediction_model2'
    ]
    
    # Import both CSV files
    total_imported = 0
    
    # Import unvoted accounts
    unvoted_count = import_csv_file(
        'df_2025_279_account_unvoted_sorted.csv',
        'account_unvoted',
        unvoted_columns
    )
    total_imported += unvoted_count
    
    print("")
    
    # Import voted accounts
    voted_count = import_csv_file(
        'df_2025_279_account_voted_sorted.csv',
        'account_voted',
        voted_columns
    )
    total_imported += voted_count
    
    print("")
    print("🎉 Import completed!")
    print(f"📊 Total records imported: {total_imported}")
    print("")
    print("📝 Verify with:")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_unvoted;'")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_voted;'")
    print("")

if __name__ == "__main__":
    main()
