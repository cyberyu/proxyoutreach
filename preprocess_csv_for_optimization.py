#!/usr/bin/env python3
"""
CSV Preprocessor for Optimized Database Schema
This script processes existing CSV files to remove redundant row_index and unnamed_col columns
and create new CSV files compatible with the optimized database schema.
"""

import csv
import sys
import os
from pathlib import Path

def preprocess_csv(input_file, output_file, table_type):
    """
    Process CSV file to remove first two columns (row_index, unnamed_col)
    and create optimized CSV for import.
    """
    print(f"📁 Processing {input_file} -> {output_file}")
    
    # Expected column mappings for optimized schema
    if table_type == 'unvoted':
        expected_columns = [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding', 
            'score_model1', 'prediction_model1', 'Target_encoded'
        ]
    elif table_type == 'voted':
        expected_columns = [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding',
            'score_model2', 'prediction_model2', 'Target_encoded'
        ]
    else:
        raise ValueError(f"Unknown table type: {table_type}")
    
    rows_processed = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', newline='', encoding='utf-8') as outfile:
            
            reader = csv.reader(infile)
            writer = csv.writer(outfile)
            
            # Read and process header
            header = next(reader)
            print(f"📊 Original columns: {len(header)}")
            print(f"🔸 First few columns: {header[:5]}")
            
            # Skip first two columns (row_index, unnamed_col) and write optimized header
            optimized_header = header[2:]  # Skip first 2 columns
            
            # Verify we have the expected number of columns
            if len(optimized_header) != len(expected_columns):
                print(f"⚠️  Warning: Expected {len(expected_columns)} columns, got {len(optimized_header)}")
                print(f"Expected: {expected_columns}")
                print(f"Got: {optimized_header}")
            
            # Write optimized header
            writer.writerow(expected_columns)
            print(f"✅ Optimized header: {expected_columns}")
            
            # Process data rows
            batch_size = 10000
            for row_num, row in enumerate(reader, 1):
                # Skip first two columns and write the rest
                optimized_row = row[2:]  # Skip row_index and unnamed_col
                
                # Ensure row has correct number of columns
                while len(optimized_row) < len(expected_columns):
                    optimized_row.append('')
                
                # Truncate if too many columns
                optimized_row = optimized_row[:len(expected_columns)]
                
                writer.writerow(optimized_row)
                rows_processed += 1
                
                # Progress indicator
                if rows_processed % batch_size == 0:
                    print(f"📈 Processed {rows_processed:,} rows...")
            
            print(f"✅ Successfully processed {rows_processed:,} data rows")
            
    except FileNotFoundError:
        print(f"❌ Input file not found: {input_file}")
        return False
    except Exception as e:
        print(f"❌ Error processing CSV: {e}")
        return False
    
    return True

def main():
    """Main function to process CSV files."""
    print("🚀 CSV Preprocessor for Optimized Database Schema")
    print("=" * 60)
    
    # Define input/output file mappings
    file_mappings = [
        {
            'input': 'df_2025_279_account_unvoted_sorted_20250817.csv',
            'output': 'df_2025_279_account_unvoted_optimized.csv',
            'type': 'unvoted'
        },
        {
            'input': 'df_2025_279_account_voted_sorted_20250817.csv', 
            'output': 'df_2025_279_account_voted_optimized.csv',
            'type': 'voted'
        }
    ]
    
    success_count = 0
    
    for mapping in file_mappings:
        input_file = mapping['input']
        output_file = mapping['output']
        table_type = mapping['type']
        
        print(f"\n📋 Processing {table_type} accounts...")
        
        if not os.path.exists(input_file):
            print(f"⚠️  Skipping {input_file} - file not found")
            continue
            
        if preprocess_csv(input_file, output_file, table_type):
            success_count += 1
            
            # Show file size comparison
            input_size = os.path.getsize(input_file) / (1024 * 1024)  # MB
            output_size = os.path.getsize(output_file) / (1024 * 1024)  # MB
            savings = input_size - output_size
            savings_pct = (savings / input_size) * 100 if input_size > 0 else 0
            
            print(f"📦 File size: {input_size:.1f}MB -> {output_size:.1f}MB")
            print(f"💾 Space saved: {savings:.1f}MB ({savings_pct:.1f}%)")
        else:
            print(f"❌ Failed to process {input_file}")
    
    print("\n" + "=" * 60)
    print(f"🎉 Processing complete! {success_count}/{len(file_mappings)} files processed")
    
    if success_count > 0:
        print("\n📝 Next steps:")
        print("1. Use the optimized CSV files for imports:")
        for mapping in file_mappings:
            if os.path.exists(mapping['output']):
                print(f"   - {mapping['output']}")
        print("2. Run the database migration script:")
        print("   ./migrate_database_schema.sh")
        print("3. Update import scripts to use optimized files")

if __name__ == "__main__":
    main()
