#!/usr/bin/env python3
"""
Test script for SDS calibrated import optimization
"""

import pymysql
import sys

def test_connection():
    """Test PyMySQL connection to proxy_sds_calibrated database"""
    try:
        print("🔍 Testing PyMySQL connection...")
        
        connection = pymysql.connect(
            host='localhost',
            user='webapp',
            password='webapppass',
            database='proxy_sds_calibrated',
            charset='utf8mb4',
            autocommit=False,
            connect_timeout=60,
            read_timeout=300,
            write_timeout=300,
            max_allowed_packet=1024*1024*1024  # 1GB
        )
        
        print("✅ PyMySQL connection successful!")
        
        cursor = connection.cursor()
        
        # Check current data
        cursor.execute("SELECT COUNT(*) FROM account_unvoted")
        unvoted_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM account_voted")
        voted_count = cursor.fetchone()[0]
        
        print(f"📊 Current database state:")
        print(f"   account_unvoted: {unvoted_count:,} records")
        print(f"   account_voted: {voted_count:,} records")
        
        # Test a small insert to verify batch processing works
        print("🧪 Testing batch insert capability...")
        test_data = [
            ('test_hash_1', 1, 1, 'I', 1000, 1, 0.5, 0.6, 1),
            ('test_hash_2', 2, 2, 'R', 2000, 2, 0.7, 0.8, 0)
        ]
        
        cursor.executemany("""
            INSERT INTO account_voted (
                account_hash_key, proposal_master_skey, director_master_skey,
                account_type, shares_summable, rank_of_shareholding,
                score_model2, prediction_model2, Target_encoded
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, test_data)
        
        connection.commit()
        print("✅ Batch insert test successful!")
        
        # Clean up test data
        cursor.execute("DELETE FROM account_voted WHERE account_hash_key LIKE 'test_hash_%'")
        connection.commit()
        print("✅ Test data cleaned up")
        
        cursor.close()
        connection.close()
        print("✅ Connection test completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

if __name__ == "__main__":
    if test_connection():
        print("\n🎉 Optimized import script is ready to use!")
        print("Run: python3 import_proxy_sds_calibrated_unified.py")
    else:
        print("\n❌ Please check database connection and try again")
        sys.exit(1)
