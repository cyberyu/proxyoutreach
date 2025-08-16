#!/bin/bash

# Data Analysis Script for Proxy Account Data
# This script provides useful queries to analyze the imported CSV data

DB_NAME="proxy"
MYSQL_USER="root"

echo "=== Proxy Account Data Analysis ==="
echo ""

# Ask for MySQL credentials
read -p "Enter MySQL username (default: root): " mysql_user
mysql_user=${mysql_user:-root}

read -s -p "Enter MySQL password: " mysql_password
echo ""
echo ""

# Function to run MySQL query
run_query() {
    local query="$1"
    local description="$2"
    
    echo "📊 $description"
    echo "Query: $query"
    echo ""
    mysql -u "$mysql_user" -p"$mysql_password" -e "USE $DB_NAME; $query" 2>/dev/null
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Basic statistics
echo "🔍 BASIC STATISTICS"
echo "==================="

run_query "SELECT COUNT(*) AS total_unvoted_accounts FROM account_unvoted;" "Total Unvoted Accounts"

run_query "SELECT COUNT(*) AS total_voted_accounts FROM account_voted;" "Total Voted Accounts"

run_query "SELECT 
    account_type, 
    COUNT(*) AS count,
    ROUND(AVG(shares_summable), 2) AS avg_shares,
    ROUND(SUM(shares_summable), 2) AS total_shares
FROM account_unvoted 
GROUP BY account_type 
ORDER BY count DESC;" "Unvoted Accounts by Type"

run_query "SELECT 
    account_type, 
    COUNT(*) AS count,
    ROUND(AVG(shares_summable), 2) AS avg_shares,
    ROUND(SUM(shares_summable), 2) AS total_shares
FROM account_voted 
GROUP BY account_type 
ORDER BY count DESC;" "Voted Accounts by Type"

# Top shareholders analysis
echo "🏆 TOP SHAREHOLDERS ANALYSIS"
echo "============================"

run_query "SELECT 
    proposal_master_skey,
    director_master_skey,
    account_type,
    shares_summable,
    rank_of_shareholding,
    score_model1
FROM account_unvoted 
ORDER BY shares_summable DESC 
LIMIT 10;" "Top 10 Unvoted Accounts by Shares"

run_query "SELECT 
    proposal_master_skey,
    director_master_skey,
    account_type,
    shares_summable,
    rank_of_shareholding,
    score_model2
FROM account_voted 
ORDER BY shares_summable DESC 
LIMIT 10;" "Top 10 Voted Accounts by Shares"

# Score analysis
echo "📈 SCORE ANALYSIS"
echo "================="

run_query "SELECT 
    MIN(score_model1) AS min_score,
    MAX(score_model1) AS max_score,
    ROUND(AVG(score_model1), 6) AS avg_score,
    ROUND(STDDEV(score_model1), 6) AS std_dev
FROM account_unvoted;" "Unvoted Accounts Score Statistics (Model 1)"

run_query "SELECT 
    MIN(score_model2) AS min_score,
    MAX(score_model2) AS max_score,
    ROUND(AVG(score_model2), 6) AS avg_score,
    ROUND(STDDEV(score_model2), 6) AS std_dev
FROM account_voted;" "Voted Accounts Score Statistics (Model 2)"

# Prediction analysis
echo "🎯 PREDICTION ANALYSIS"
echo "======================"

run_query "SELECT 
    prediction_model1,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM account_unvoted), 2) AS percentage
FROM account_unvoted 
GROUP BY prediction_model1;" "Unvoted Accounts Prediction Distribution"

run_query "SELECT 
    prediction_model2,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM account_voted), 2) AS percentage
FROM account_voted 
GROUP BY prediction_model2;" "Voted Accounts Prediction Distribution"

# Shares distribution
echo "💰 SHARES DISTRIBUTION"
echo "====================="

run_query "SELECT 
    CASE 
        WHEN shares_summable = 0 THEN '0 shares'
        WHEN shares_summable > 0 AND shares_summable <= 10 THEN '1-10 shares'
        WHEN shares_summable > 10 AND shares_summable <= 100 THEN '11-100 shares'
        WHEN shares_summable > 100 AND shares_summable <= 1000 THEN '101-1000 shares'
        WHEN shares_summable > 1000 THEN '1000+ shares'
    END AS share_range,
    COUNT(*) AS count
FROM account_unvoted 
GROUP BY 
    CASE 
        WHEN shares_summable = 0 THEN '0 shares'
        WHEN shares_summable > 0 AND shares_summable <= 10 THEN '1-10 shares'
        WHEN shares_summable > 10 AND shares_summable <= 100 THEN '11-100 shares'
        WHEN shares_summable > 100 AND shares_summable <= 1000 THEN '101-1000 shares'
        WHEN shares_summable > 1000 THEN '1000+ shares'
    END
ORDER BY count DESC;" "Unvoted Accounts Shares Distribution"

run_query "SELECT 
    CASE 
        WHEN shares_summable = 0 THEN '0 shares'
        WHEN shares_summable > 0 AND shares_summable <= 10 THEN '1-10 shares'
        WHEN shares_summable > 10 AND shares_summable <= 100 THEN '11-100 shares'
        WHEN shares_summable > 100 AND shares_summable <= 1000 THEN '101-1000 shares'
        WHEN shares_summable > 1000 THEN '1000+ shares'
    END AS share_range,
    COUNT(*) AS count
FROM account_voted 
GROUP BY 
    CASE 
        WHEN shares_summable = 0 THEN '0 shares'
        WHEN shares_summable > 0 AND shares_summable <= 10 THEN '1-10 shares'
        WHEN shares_summable > 10 AND shares_summable <= 100 THEN '11-100 shares'
        WHEN shares_summable > 100 AND shares_summable <= 1000 THEN '101-1000 shares'
        WHEN shares_summable > 1000 THEN '1000+ shares'
    END
ORDER BY count DESC;" "Voted Accounts Shares Distribution"

echo "✅ Analysis complete!"
echo ""
echo "💡 Tips for further analysis:"
echo "  - Connect to database: mysql -u $mysql_user -p$mysql_password $DB_NAME"
echo "  - View table structure: DESCRIBE account_unvoted;"
echo "  - Custom queries: SELECT * FROM account_unvoted WHERE shares_summable > 1000;"
echo ""
