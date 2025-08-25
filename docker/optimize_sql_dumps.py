#!/usr/bin/env python3
"""
Optimize SQL dumps by converting individual INSERT statements to bulk format
This will dramatically improve import performance by reducing transaction overhead
"""

import re
import sys
import gzip
from pathlib import Path

def optimize_sql_dump(input_file, output_file, batch_size=1000):
    """Convert individual INSERT statements to bulk INSERT format"""
    
    print(f"🔄 Optimizing {input_file} -> {output_file}")
    print(f"📊 Batch size: {batch_size} rows per INSERT")
    
    # Open files (handle both .sql and .sql.gz)
    if str(input_file).endswith('.gz'):
        input_handle = gzip.open(input_file, 'rt', encoding='utf-8')
    else:
        input_handle = open(input_file, 'r', encoding='utf-8')
    
    if str(output_file).endswith('.gz'):
        output_handle = gzip.open(output_file, 'wt', encoding='utf-8')
    else:
        output_handle = open(output_file, 'w', encoding='utf-8')
    
    try:
        current_table = None
        current_batch = []
        insert_pattern = re.compile(r'^INSERT INTO `([^`]+)` VALUES (.+);$')
        lines_processed = 0
        inserts_converted = 0
        
        for line in input_handle:
            lines_processed += 1
            if lines_processed % 100000 == 0:
                print(f"📈 Processed {lines_processed:,} lines, converted {inserts_converted:,} INSERTs...")
            
            # Check if this is an INSERT statement
            match = insert_pattern.match(line.strip())
            
            if match:
                table_name = match.group(1)
                values_part = match.group(2)
                
                # If we're starting a new table, flush previous batch
                if table_name != current_table:
                    if current_batch and current_table:
                        _write_batch(output_handle, current_table, current_batch)
                        inserts_converted += len(current_batch)
                        current_batch = []
                    current_table = table_name
                
                # Add values to current batch
                current_batch.append(values_part)
                
                # Write batch if it's full
                if len(current_batch) >= batch_size:
                    _write_batch(output_handle, current_table, current_batch)
                    inserts_converted += len(current_batch)
                    current_batch = []
            
            else:
                # Not an INSERT statement - write as-is, but flush batch first
                if current_batch and current_table:
                    _write_batch(output_handle, current_table, current_batch)
                    inserts_converted += len(current_batch)
                    current_batch = []
                    current_table = None
                
                output_handle.write(line)
        
        # Flush any remaining batch
        if current_batch and current_table:
            _write_batch(output_handle, current_table, current_batch)
            inserts_converted += len(current_batch)
        
        print(f"✅ Optimization complete!")
        print(f"📊 Lines processed: {lines_processed:,}")
        print(f"🚀 INSERT statements converted: {inserts_converted:,}")
        
    finally:
        input_handle.close()
        output_handle.close()

def _write_batch(output_handle, table_name, batch):
    """Write a batch of VALUES as a single INSERT statement"""
    if not batch:
        return
    
    # Write bulk INSERT statement
    output_handle.write(f"INSERT INTO `{table_name}` VALUES\n")
    
    # Write each row, comma-separated
    for i, values in enumerate(batch):
        if i == len(batch) - 1:
            # Last row - no comma, add semicolon
            output_handle.write(f"{values};\n")
        else:
            # Not last row - add comma
            output_handle.write(f"{values},\n")

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 optimize_sql_dumps.py input.sql output.sql")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])
    
    if not input_file.exists():
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    
    # Get file sizes
    input_size = input_file.stat().st_size
    print(f"📂 Input file: {input_file} ({input_size / 1024 / 1024 / 1024:.1f} GB)")
    
    optimize_sql_dump(input_file, output_file)
    
    # Show output size
    output_size = output_file.stat().st_size
    print(f"📂 Output file: {output_file} ({output_size / 1024 / 1024 / 1024:.1f} GB)")
    print(f"💾 Size change: {((output_size - input_size) / input_size * 100):+.1f}%")

if __name__ == "__main__":
    main()
