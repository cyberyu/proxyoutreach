#!/usr/bin/env python3
"""
CSV Format Verification Script for Optimized Database Schema
This script validates CSV files to ensure they match the optimized database schema
without row_index and unnamed_col columns.
"""

import csv
import sys
import os
import argparse
from pathlib import Path

def validate_csv_format(csv_file, table_type, verbose=False):
    """
    Validate CSV file format against optimized database schema.
    
    Args:
        csv_file (str): Path to CSV file to validate
        table_type (str): Type of table ('unvoted' or 'voted')
        verbose (bool): Whether to show detailed output
        
    Returns:
        dict: Validation results with success status and any errors
    """
    
    # Define expected schemas for optimized tables
    expected_schemas = {
        'unvoted': [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding', 
            'score_model1', 'prediction_model1', 'Target_encoded'
        ],
        'voted': [
            'account_hash_key', 'proposal_master_skey', 'director_master_skey',
            'account_type', 'shares_summable', 'rank_of_shareholding',
            'score_model2', 'prediction_model2', 'Target_encoded'
        ]
    }
    
    # Data type validation rules
    type_validators = {
        'account_hash_key': lambda x: isinstance(x, str) and len(x) > 0,
        'proposal_master_skey': lambda x: x.isdigit() if isinstance(x, str) else isinstance(x, int),
        'director_master_skey': lambda x: x.isdigit() if isinstance(x, str) else isinstance(x, int),
        'account_type': lambda x: isinstance(x, str) and x in ['Individual', 'Institution', 'Mutual Fund', 'Other'],
        'shares_summable': lambda x: _is_float(x),
        'rank_of_shareholding': lambda x: x.isdigit() if isinstance(x, str) else isinstance(x, int),
        'score_model1': lambda x: _is_float(x),
        'score_model2': lambda x: _is_float(x),
        'prediction_model1': lambda x: x in ['0', '1', 0, 1] if x else True,
        'prediction_model2': lambda x: x in ['0', '1', 0, 1] if x else True,
        'Target_encoded': lambda x: x.isdigit() if isinstance(x, str) else isinstance(x, int)
    }
    
    def _is_float(value):
        """Check if value can be converted to float."""
        if value == '' or value is None:
            return True  # Allow empty values
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            return False
    
    results = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'stats': {
            'total_rows': 0,
            'valid_rows': 0,
            'file_size_mb': 0
        }
    }
    
    if table_type not in expected_schemas:
        results['valid'] = False
        results['errors'].append(f"Unknown table type: {table_type}. Must be 'unvoted' or 'voted'")
        return results
    
    expected_columns = expected_schemas[table_type]
    
    try:
        # Check file exists and get size
        if not os.path.exists(csv_file):
            results['valid'] = False
            results['errors'].append(f"File not found: {csv_file}")
            return results
        
        file_size = os.path.getsize(csv_file)
        results['stats']['file_size_mb'] = round(file_size / (1024 * 1024), 2)
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Read and validate header
            reader = csv.reader(file)
            
            try:
                header = next(reader)
            except StopIteration:
                results['valid'] = False
                results['errors'].append("File is empty")
                return results
            
            # Clean header (remove BOM and whitespace)
            header = [col.strip().replace('\ufeff', '') for col in header]
            
            if verbose:
                print(f"📊 Found columns: {header}")
                print(f"📋 Expected columns: {expected_columns}")
            
            # Check column count
            if len(header) != len(expected_columns):
                results['valid'] = False
                results['errors'].append(
                    f"Column count mismatch: found {len(header)}, expected {len(expected_columns)}"
                )
            
            # Check column names
            missing_columns = set(expected_columns) - set(header)
            extra_columns = set(header) - set(expected_columns)
            
            if missing_columns:
                results['valid'] = False
                results['errors'].append(f"Missing columns: {', '.join(missing_columns)}")
            
            if extra_columns:
                results['warnings'].append(f"Extra columns: {', '.join(extra_columns)}")
            
            # Check for old redundant columns
            redundant_columns = set(['row_index', 'unnamed_col']) & set(header)
            if redundant_columns:
                results['valid'] = False
                results['errors'].append(
                    f"Found redundant columns from old schema: {', '.join(redundant_columns)}. "
                    "Please use optimized CSV format without these columns."
                )
            
            # Validate data rows (sample first 100 rows for performance)
            row_errors = []
            sample_size = 100
            
            for row_num, row in enumerate(reader, 1):
                results['stats']['total_rows'] = row_num
                
                if row_num > sample_size:
                    if verbose:
                        print(f"📊 Validated sample of {sample_size} rows. Total rows: {row_num}")
                    break
                
                # Check row length
                if len(row) != len(expected_columns):
                    row_errors.append(f"Row {row_num}: Expected {len(expected_columns)} columns, got {len(row)}")
                    continue
                
                # Validate data types (only for sample)
                valid_row = True
                for i, (col_name, value) in enumerate(zip(expected_columns, row)):
                    if col_name in type_validators:
                        if not type_validators[col_name](value):
                            row_errors.append(
                                f"Row {row_num}, Column '{col_name}': Invalid value '{value}'"
                            )
                            valid_row = False
                
                if valid_row:
                    results['stats']['valid_rows'] += 1
            
            # Add row errors to results (limit to avoid spam)
            if row_errors:
                if len(row_errors) > 10:
                    results['errors'].extend(row_errors[:10])
                    results['errors'].append(f"... and {len(row_errors) - 10} more data validation errors")
                else:
                    results['errors'].extend(row_errors)
                
                if len(row_errors) > 5:  # If many errors, mark as invalid
                    results['valid'] = False
            
    except Exception as e:
        results['valid'] = False
        results['errors'].append(f"Error reading file: {str(e)}")
    
    return results

def main():
    """Main function for command line usage."""
    parser = argparse.ArgumentParser(
        description='Validate CSV files for optimized database schema'
    )
    parser.add_argument('csv_file', help='Path to CSV file to validate')
    parser.add_argument('table_type', choices=['unvoted', 'voted'], 
                       help='Type of table (unvoted or voted)')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Show detailed validation output')
    parser.add_argument('--sample-only', action='store_true',
                       help='Only validate a sample of rows for large files')
    
    args = parser.parse_args()
    
    print(f"🔍 Validating CSV file: {args.csv_file}")
    print(f"📋 Table type: {args.table_type}")
    print("=" * 60)
    
    results = validate_csv_format(args.csv_file, args.table_type, args.verbose)
    
    # Display results
    print(f"\n📊 Validation Results:")
    print(f"   File size: {results['stats']['file_size_mb']} MB")
    print(f"   Total rows: {results['stats']['total_rows']:,}")
    print(f"   Valid rows: {results['stats']['valid_rows']:,}")
    
    if results['valid']:
        print("✅ Validation PASSED - File format is correct")
    else:
        print("❌ Validation FAILED - File has format issues")
    
    if results['warnings']:
        print(f"\n⚠️  Warnings:")
        for warning in results['warnings']:
            print(f"   - {warning}")
    
    if results['errors']:
        print(f"\n❌ Errors:")
        for error in results['errors']:
            print(f"   - {error}")
    
    if results['valid']:
        print(f"\n💡 Next steps:")
        print(f"   1. Import this file using the optimized import scripts")
        print(f"   2. Verify data integrity after import")
        print(f"   3. Test application functionality")
    else:
        print(f"\n🔧 How to fix:")
        print(f"   1. Ensure CSV has the correct column headers")
        print(f"   2. Remove any row_index or unnamed_col columns")
        print(f"   3. Validate data types in each column")
        print(f"   4. Use the preprocess_csv_for_optimization.py script if needed")
    
    # Exit with appropriate code
    sys.exit(0 if results['valid'] else 1)

if __name__ == "__main__":
    main()
