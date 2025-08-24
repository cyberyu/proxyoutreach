#!/usr/bin/env python3

import csv
import mysql.connector
import os
import sys
from mysql.connector import Error

def connect_to_mysql():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='proxy',
            user='root'
        )
        print("✅ Connected to MySQL as root (no password)")
        return connection
    except Error:
        import getpass
        password = getpass.getpass("Enter MySQL password: ")
        connection = mysql.connector.connect(
            host='localhost',
            database='proxy',
            user='root',
            password=password
        )
        print("✅ Connected to MySQL as root (with password)")
        return connection
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def create_table_schema(connection, table_name, columns):
    try:
        cursor = connection.cursor()
        print(f"🗑️  Dropping table {table_name} if exists...")
        cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
        column_definitions = []
        for col in columns:
            if col in ['account_hash_key']:
                column_definitions.append(f"{col} VARCHAR(255) NOT NULL")
            elif col in ['proposal_master_skey', 'director_master_skey']:
                column_definitions.append(f"{col} INT")
            elif col in ['account_type']:
                column_definitions.append(f"{col} VARCHAR(100)")
            elif col in ['shares_summable']:
                column_definitions.append(f"{col} DECIMAL(20,2)")
            elif col in ['rank_of_shareholding']:
                column_definitions.append(f"{col} INT")
            elif col in ['score_model1', 'score_model2']:
                column_definitions.append(f"{col} DECIMAL(10,6)")
            elif col in ['prediction_model1', 'prediction_model2']:
                column_definitions.append(f"{col} TINYINT")
            elif col in ['Target_encoded']:
                column_definitions.append(f"{col} INT")
            else:
                column_definitions.append(f"{col} VARCHAR(255)")
        create_table_sql = f"""
        CREATE TABLE {table_name} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            {', '.join(column_definitions)},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        print(f"🔨 Creating table {table_name}...")
        cursor.execute(create_table_sql)
        connection.commit()
        print(f"✅ Table {table_name} created successfully")
    except Error as e:
        print(f"❌ Error creating table {table_name}: {e}")
        raise

def import_csv_to_table(connection, csv_file, table_name, columns):
    try:
        cursor = connection.cursor()
        if not os.path.exists(csv_file):
            print(f"⚠️  Warning: {csv_file} not found")
            return 0
        print(f"📥 Importing {csv_file} to {table_name}...")
        placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        imported_count = 0
        batch_size = 1000
        batch_data = []
        with open(csv_file, 'r', encoding='utf-8') as file:
            next(file)
            csv_reader = csv.reader(file)
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    if len(row) < len(columns):
                        row.extend([''] * (len(columns) - len(row)))
                    processed_row = []
                    for i, value in enumerate(row[:len(columns)]):
                        if value == '' or value is None:
                            processed_row.append(None)
                        else:
                            col_name = columns[i]
                            if col_name in ['proposal_master_skey', 'director_master_skey', 'rank_of_shareholding']:
                                try:
                                    processed_row.append(int(float(value)) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif col_name in ['shares_summable', 'score_model1', 'score_model2']:
                                try:
                                    processed_row.append(float(value) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            elif col_name in ['prediction_model1', 'prediction_model2']:
                                try:
                                    processed_row.append(int(float(value)) if value else 0)
                                except (ValueError, TypeError):
                                    processed_row.append(0)
                            elif col_name in ['Target_encoded']:
                                try:
                                    processed_row.append(int(float(value)) if value else None)
                                except (ValueError, TypeError):
                                    processed_row.append(None)
                            else:
                                processed_row.append(str(value) if value else None)
                    batch_data.append(processed_row)
                    if len(batch_data) >= batch_size:
                        cursor.executemany(insert_query, batch_data)
                        connection.commit()
                        imported_count += len(batch_data)
                        batch_data = []
                        print(f"  Imported {imported_count} records...")
                except Exception as e:
                    print(f"  Warning: Skipping row {row_num} due to error: {e}")
                    continue
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
    print("=== CSV Import Tool for Proxy Database (2025-08-17) ===\n")
    connection = connect_to_mysql()
    if not connection:
        print("❌ Could not connect to database")
        sys.exit(1)
    print("")
    unvoted_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model1', 'prediction_model1', 'Target_encoded'
    ]
    voted_columns = [
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model2', 'prediction_model2', 'Target_encoded'
    ]
    try:
        create_table_schema(connection, 'account_unvoted', unvoted_columns)
        create_table_schema(connection, 'account_voted', voted_columns)
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        connection.close()
        sys.exit(1)
    print("")
    total_imported = 0
    unvoted_count = import_csv_to_table(
        connection,
        'df_2025_279_account_unvoted_sorted_20250817.csv',
        'account_unvoted',
        unvoted_columns
    )
    total_imported += unvoted_count
    print("")
    voted_count = import_csv_to_table(
        connection,
        'df_2025_279_account_voted_sorted_20250817.csv',
        'account_voted',
        voted_columns
    )
    total_imported += voted_count
    connection.close()
    print("")
    print("🎉 Import completed!")
    print(f"📊 Total records imported: {total_imported}")
    print("")
    print("📝 Verify with these commands:")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_unvoted;'")
    print("  sudo mysql -u root -e 'USE proxy; SELECT COUNT(*) FROM account_voted;'")
    print("  sudo mysql -u root -e 'USE proxy; DESCRIBE account_unvoted;'")
    print("  sudo mysql -u root -e 'USE proxy; DESCRIBE account_voted;'")
    print("")

if __name__ == "__main__":
    main()
