#!/bin/bash

# Generate comprehensive sample data for both proxy and proxy_sds databases
# This creates realistic datasets for development and testing

set -e

echo "📊 Generating sample data for proxy outreach system..."

# Create data directories
mkdir -p /usr/src/app/data/csv
mkdir -p /usr/src/app/data/excel
mkdir -p /usr/src/app/data/parquet

# Generate sample data using Python
python3 << 'EOF'
import csv
import random
import hashlib
import datetime
from openpyxl import Workbook
import pandas as pd
import os

# Sample data configuration
NUM_PROPOSALS = 279
NUM_ACCOUNTS_UNVOTED = 15000
NUM_ACCOUNTS_VOTED = 8500
NUM_SDS_ACCOUNTS = 12000

# Sample company names for realistic data
COMPANIES = [
    "Apple Inc.", "Microsoft Corporation", "Amazon.com Inc.", "Alphabet Inc.",
    "Tesla Inc.", "Meta Platforms Inc.", "NVIDIA Corporation", "Netflix Inc.",
    "Adobe Inc.", "Salesforce Inc.", "PayPal Holdings Inc.", "Intel Corporation",
    "Oracle Corporation", "Cisco Systems Inc.", "IBM Corporation", "AMD Inc.",
    "Qualcomm Inc.", "Broadcom Inc.", "Texas Instruments Inc.", "Applied Materials Inc.",
    "Mastercard Inc.", "Visa Inc.", "JPMorgan Chase & Co.", "Bank of America Corp.",
    "Wells Fargo & Company", "Goldman Sachs Group Inc.", "Morgan Stanley", "Citigroup Inc.",
    "American Express Company", "BlackRock Inc.", "Berkshire Hathaway Inc.", "Johnson & Johnson",
    "Procter & Gamble Co.", "Coca-Cola Company", "PepsiCo Inc.", "McDonald's Corporation",
    "Nike Inc.", "Home Depot Inc.", "Walmart Inc.", "Target Corporation"
]

CATEGORIES = [
    "Executive Compensation", "Director Election", "Board Governance", 
    "Shareholder Proposals", "Environmental Initiatives", "Social Responsibility",
    "Audit Committee", "Stock Option Plans", "Merger & Acquisition",
    "Capital Structure", "Dividend Policy", "Risk Management"
]

PROPOSAL_TEMPLATES = [
    "Election of Director {name}",
    "Approval of Executive Compensation Package",
    "Ratification of Independent Auditor Selection",
    "Amendment to Stock Incentive Plan",
    "Shareholder Proposal on Climate Change Disclosure",
    "Approval of Merger with {company}",
    "Authorization of Share Repurchase Program",
    "Amendment to Corporate Bylaws",
    "Approval of Long-Term Incentive Plan",
    "Shareholder Proposal on Board Diversity"
]

def generate_account_hash(base_id):
    """Generate realistic account hash"""
    return hashlib.md5(f"account_{base_id}_{random.randint(1000, 9999)}".encode()).hexdigest()[:24]

def generate_proposal_key():
    """Generate realistic proposal master key"""
    return random.randint(2024001, 2024999)

def generate_director_key():
    """Generate director master key (-1 for non-director proposals)"""
    return random.choice([-1, random.randint(1001, 9999)])

print("📝 Generating proxy database CSV files...")

# Generate account_unvoted.csv for proxy database
print("  → Creating account_unvoted.csv...")
with open('/usr/src/app/data/csv/proxy_account_unvoted.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding',
        'score_model1', 'prediction_model1'
    ])
    
    for i in range(NUM_ACCOUNTS_UNVOTED):
        writer.writerow([
            generate_account_hash(i),
            generate_proposal_key(),
            generate_director_key(),
            random.choice(['Individual', 'Institution', 'Fund']),
            round(random.uniform(100, 1000000), 4),
            random.randint(1, 50000),
            round(random.uniform(0.1, 0.9), 15),
            random.choice([0, 1])
        ])

# Generate account_voted.csv for proxy database
print("  → Creating account_voted.csv...")
with open('/usr/src/app/data/csv/proxy_account_voted.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding',
        'score_model1', 'prediction_model1', 'true_outcome'
    ])
    
    for i in range(NUM_ACCOUNTS_VOTED):
        prediction = random.choice([0, 1])
        # Make predictions correct 75% of the time
        true_outcome = prediction if random.random() < 0.75 else 1 - prediction
        
        writer.writerow([
            generate_account_hash(i + 20000),
            generate_proposal_key(),
            generate_director_key(),
            random.choice(['Individual', 'Institution', 'Fund']),
            round(random.uniform(100, 1000000), 4),
            random.randint(1, 50000),
            round(random.uniform(0.1, 0.9), 15),
            prediction,
            true_outcome
        ])

print("📈 Generating Excel proposal files...")

# Generate proposals Excel file for proxy database
print("  → Creating proxy_proposals.xlsx...")
wb = Workbook()
ws = wb.active
ws.title = "Proposals"

# Headers
headers = [
    'proposal_master_skey', 'director_master_skey', 'issuer_name', 'category',
    'proposal', 'prediction_correct', 'approved', 'for_percentage', 'against_percentage',
    'pred_for_shares', 'pred_against_shares', 'pred_abstain_shares', 'pred_unvoted_shares',
    'true_for_shares', 'true_against_shares', 'true_abstain_shares', 'true_unvoted_shares'
]
ws.append(headers)

# Generate proposal data
for i in range(NUM_PROPOSALS):
    proposal_key = generate_proposal_key()
    director_key = generate_director_key()
    company = random.choice(COMPANIES)
    category = random.choice(CATEGORIES)
    
    # Generate proposal text
    template = random.choice(PROPOSAL_TEMPLATES)
    if "{name}" in template:
        names = ["John Smith", "Jane Doe", "Robert Johnson", "Mary Williams"]
        proposal_text = template.format(name=random.choice(names))
    elif "{company}" in template:
        proposal_text = template.format(company=random.choice(COMPANIES))
    else:
        proposal_text = template
    
    # Generate voting data
    total_shares = random.randint(10000000, 100000000)
    for_pct = round(random.uniform(30, 80), 2)
    against_pct = round(100 - for_pct - random.uniform(5, 20), 2)
    
    # Prediction accuracy (75% correct)
    actual_approved = for_pct > 50
    predicted_approved = actual_approved if random.random() < 0.75 else not actual_approved
    prediction_correct = actual_approved == predicted_approved
    
    # Share distribution
    pred_for = int(total_shares * (for_pct / 100) * random.uniform(0.9, 1.1))
    pred_against = int(total_shares * (against_pct / 100) * random.uniform(0.9, 1.1))
    pred_abstain = int(total_shares * random.uniform(0.05, 0.15))
    pred_unvoted = total_shares - pred_for - pred_against - pred_abstain
    
    true_for = int(total_shares * (for_pct / 100))
    true_against = int(total_shares * (against_pct / 100))
    true_abstain = int(total_shares * random.uniform(0.05, 0.15))
    true_unvoted = total_shares - true_for - true_against - true_abstain
    
    ws.append([
        proposal_key, director_key, company, category, proposal_text,
        prediction_correct, actual_approved, for_pct, against_pct,
        pred_for, pred_against, pred_abstain, pred_unvoted,
        true_for, true_against, true_abstain, true_unvoted
    ])

wb.save('/usr/src/app/data/excel/proxy_proposals.xlsx')

# Generate SDS proposals Excel file
print("  → Creating sds_proposals.xlsx...")
wb_sds = Workbook()
ws_sds = wb_sds.active
ws_sds.title = "SDS_Proposals"

ws_sds.append(headers)

for i in range(NUM_PROPOSALS):
    proposal_key = generate_proposal_key()
    director_key = generate_director_key()
    company = random.choice(COMPANIES)
    category = random.choice(CATEGORIES)
    
    template = random.choice(PROPOSAL_TEMPLATES)
    if "{name}" in template:
        names = ["Alice Cooper", "Bob Anderson", "Carol Davis", "David Wilson"]
        proposal_text = template.format(name=random.choice(names))
    elif "{company}" in template:
        proposal_text = template.format(company=random.choice(COMPANIES))
    else:
        proposal_text = template
    
    total_shares = random.randint(10000000, 100000000)
    for_pct = round(random.uniform(30, 80), 2)
    against_pct = round(100 - for_pct - random.uniform(5, 20), 2)
    
    actual_approved = for_pct > 50
    predicted_approved = actual_approved if random.random() < 0.78 else not actual_approved
    prediction_correct = actual_approved == predicted_approved
    
    pred_for = int(total_shares * (for_pct / 100) * random.uniform(0.9, 1.1))
    pred_against = int(total_shares * (against_pct / 100) * random.uniform(0.9, 1.1))
    pred_abstain = int(total_shares * random.uniform(0.05, 0.15))
    pred_unvoted = total_shares - pred_for - pred_against - pred_abstain
    
    true_for = int(total_shares * (for_pct / 100))
    true_against = int(total_shares * (against_pct / 100))
    true_abstain = int(total_shares * random.uniform(0.05, 0.15))
    true_unvoted = total_shares - true_for - true_against - true_abstain
    
    ws_sds.append([
        proposal_key, director_key, company, category, proposal_text,
        prediction_correct, actual_approved, for_pct, against_pct,
        pred_for, pred_against, pred_abstain, pred_unvoted,
        true_for, true_against, true_abstain, true_unvoted
    ])

wb_sds.save('/usr/src/app/data/excel/sds_proposals.xlsx')

print("📊 Generating SDS CSV files...")

# Generate SDS account data
print("  → Creating sds_account_voted.csv...")
with open('/usr/src/app/data/csv/sds_account_voted.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'account_hash_key', 'proposal_master_skey', 'director_master_skey',
        'account_type', 'shares_summable', 'rank_of_shareholding',
        'score_model1', 'prediction_model1', 'true_outcome'
    ])
    
    for i in range(NUM_SDS_ACCOUNTS):
        prediction = random.choice([0, 1])
        true_outcome = prediction if random.random() < 0.78 else 1 - prediction
        
        writer.writerow([
            generate_account_hash(i + 50000),
            generate_proposal_key(),
            generate_director_key(),
            random.choice(['Individual', 'Institution', 'Fund']),
            round(random.uniform(100, 1000000), 4),
            random.randint(1, 50000),
            round(random.uniform(0.1, 0.9), 15),
            prediction,
            true_outcome
        ])

print("✅ Sample data generation completed!")
print(f"   📁 Generated files in /usr/src/app/data/:")
print(f"      - CSV: proxy_account_unvoted.csv ({NUM_ACCOUNTS_UNVOTED:,} records)")
print(f"      - CSV: proxy_account_voted.csv ({NUM_ACCOUNTS_VOTED:,} records)")
print(f"      - CSV: sds_account_voted.csv ({NUM_SDS_ACCOUNTS:,} records)")
print(f"      - Excel: proxy_proposals.xlsx ({NUM_PROPOSALS} proposals)")
print(f"      - Excel: sds_proposals.xlsx ({NUM_PROPOSALS} proposals)")

EOF

echo "🎯 Sample data generation completed successfully!"
