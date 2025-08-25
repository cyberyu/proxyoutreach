# Database Dump Performance Analysis

## Overview

This document analyzes the performance differences between the reference container (`proxy-outreach:fixed-context`) and our optimized dumps, explaining why the reference imports 2x faster despite identical data size and bulk INSERT format.

## Performance Comparison

| Metric | Reference Container | Our Optimized Version |
|--------|-------------------|---------------------|
| **Import Time** | ≤12 minutes | 23+ minutes |
| **Import Speed** | ≥181 MB/min | ~94 MB/min |
| **Database Size** | 2.2G | 2.2G (matched) |
| **INSERT Format** | Extended bulk INSERTs | Extended bulk INSERTs |
| **Performance Gap** | Baseline | **2x slower** |

## Root Cause Analysis

### Key Differences Between Reference and Current Dumps

#### 1. **Table Schema Differences**

**Reference (`proxy_backup_new.sql`):**
```sql
CREATE TABLE `account_unvoted` (
  `id` int NOT NULL AUTO_INCREMENT,
  `row_index` int DEFAULT NULL,                    -- ✅ Extra column
  `unnamed_col` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,  -- ✅ Extra column
  `account_hash_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proposal_master_skey` int DEFAULT NULL,         -- ✅ Simple int type
  `director_master_skey` int DEFAULT NULL,         -- ✅ Simple int type
  `account_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shares_summable` decimal(20,2) DEFAULT NULL,    -- ✅ Simple precision
  `rank_of_shareholding` int DEFAULT NULL,         -- ✅ Simple int type
  `score_model1` decimal(10,6) DEFAULT NULL,       -- ✅ Lower precision
  `prediction_model1` tinyint DEFAULT NULL,
  `Target_encoded` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)                               -- ✅ ONLY PRIMARY KEY
) ENGINE=InnoDB AUTO_INCREMENT=17222473 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Current (`docker/proxy_complete_dump.sql`):**
```sql
CREATE TABLE `account_unvoted` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_hash_key` varchar(255) NOT NULL,        -- ❌ Missing extra columns
  `proposal_master_skey` bigint DEFAULT NULL,      -- ❌ Complex bigint type
  `director_master_skey` bigint DEFAULT NULL,      -- ❌ Complex bigint type
  `account_type` varchar(10) DEFAULT NULL,
  `shares_summable` decimal(15,4) DEFAULT NULL,    -- ❌ Higher precision
  `rank_of_shareholding` bigint DEFAULT NULL,      -- ❌ Complex bigint type
  `score_model1` decimal(20,15) DEFAULT NULL,      -- ❌ Very high precision
  `prediction_model1` tinyint DEFAULT NULL,
  `Target_encoded` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_hash` (`account_hash_key`),      -- ❌ Secondary index
  KEY `idx_proposal_skey` (`proposal_master_skey`), -- ❌ Secondary index
  KEY `idx_director_skey` (`director_master_skey`), -- ❌ Secondary index
  KEY `idx_account_type` (`account_type`),          -- ❌ Secondary index
  KEY `idx_shares` (`shares_summable`),             -- ❌ Secondary index
  KEY `idx_rank` (`rank_of_shareholding`)           -- ❌ Secondary index
) ENGINE=InnoDB AUTO_INCREMENT=17222473 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### 2. **Critical Performance Impact: Secondary Indexes**

**Primary Cause of 2x Performance Gap:**

- **Reference**: Only 1 index (PRIMARY KEY) to maintain during import
- **Current**: 7 indexes (PRIMARY + 6 secondary) to maintain during import

For 17+ million row imports:
- **Reference**: Each INSERT updates 1 index
- **Current**: Each INSERT updates 7 indexes = **7x more index operations**

#### 3. **Data Type Complexity**

| Aspect | Reference | Current | Impact |
|--------|-----------|---------|---------|
| Foreign Keys | `int` | `bigint` | More CPU/memory per operation |
| Decimal Precision | `decimal(20,2)` | `decimal(20,15)` | Higher precision = slower processing |
| Shares | `decimal(20,2)` | `decimal(15,4)` | Different precision handling |

#### 4. **Collation Differences**

| Database | Collation | Characteristics |
|----------|-----------|----------------|
| Reference | `utf8mb4_unicode_ci` | Older, simpler Unicode rules |
| Current | `utf8mb4_0900_ai_ci` | Newer Unicode 9.0, more complex rules |

**Impact**: Newer collations have more sophisticated comparison rules, adding processing overhead.

#### 5. **MySQL Configuration Compatibility**

Both dumps use identical MySQL settings:
```sql
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
```

## Performance Optimization Solution

### Reference-Compatible Dump Generation

The updated `generate_optimized_dumps.sh` script now creates reference-compatible dumps by:

1. **Removing Secondary Indexes**: Filters out all `KEY idx_*` definitions
2. **Using Reference Collation**: Converts `utf8mb4_0900_ai_ci` → `utf8mb4_unicode_ci`  
3. **Maintaining Bulk INSERT Format**: Preserves extended INSERT statements
4. **Excluding Backup Tables**: Matches reference database content

### Expected Performance Improvement

With reference-compatible dumps:
- **Target Import Time**: ≤12 minutes (matching reference)
- **Index Operations**: Reduced from 7x to 1x per INSERT
- **Collation Processing**: Simplified Unicode handling
- **Overall Speedup**: ~2x performance improvement

## Implementation Notes

### Why Reference Has Better Performance

1. **Optimized for Import Speed**: No secondary indexes during initial load
2. **Simpler Data Types**: Uses basic `int` and low-precision `decimal` types
3. **Older Collation**: Less complex Unicode processing rules
4. **Post-Import Indexing**: Likely adds indexes after data load completes

### Production Considerations

- **Application Performance**: Secondary indexes improve query performance
- **Import vs Runtime Trade-off**: Fast imports vs fast queries
- **Index Strategy**: Consider adding indexes after import for production use
- **Schema Evolution**: Current schema may be evolved version of reference

## Files Modified

- `generate_optimized_dumps.sh`: Updated to generate reference-compatible dumps
- `docker/proxy_complete_dump.sql`: Will be regenerated with new format
- `docker/proxy_sds_complete_dump.sql`: Will be regenerated with new format

## Verification Steps

1. Generate new dumps with reference-compatible script
2. Build Docker container with new dumps  
3. Measure import time (target: ≤12 minutes)
4. Verify application functionality with simplified schema
5. Consider post-import index addition if needed for query performance

---

**Date**: August 25, 2025  
**Analysis Based On**: Comparison between `proxy-outreach:fixed-context` and current optimization attempts
