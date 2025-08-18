const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'webapp',
  password: 'webapppass',
  database: 'proxy'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create database and tables if they don't exist
  initializeDatabase();
});

// Initialize database and tables
function initializeDatabase() {
  // Create accounts table
  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id VARCHAR(255) UNIQUE,
      account_name VARCHAR(255),
      voting_status ENUM('voted', 'unvoted') DEFAULT 'unvoted',
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      outreach_status ENUM('pending', 'contacted', 'responded', 'completed') DEFAULT 'pending',
      last_contact_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  // Create outreach_logs table
  const createOutreachLogsTable = `
    CREATE TABLE IF NOT EXISTS outreach_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id VARCHAR(255),
      contact_method ENUM('email', 'phone', 'meeting'),
      contact_date DATE,
      outcome VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(account_id)
    )
  `;

  // Create outreach table (make schema identical to account_unvoted) and migrate if needed
  const createOutreachTable = `
    CREATE TABLE IF NOT EXISTS outreach (
      id INT AUTO_INCREMENT PRIMARY KEY,
      row_index INT NULL,
      unnamed_col VARCHAR(255) NULL,
      account_hash_key VARCHAR(255) NOT NULL,
      proposal_master_skey BIGINT NULL,
      director_master_skey BIGINT NULL,
      account_type VARCHAR(100) NULL,
      shares_summable DECIMAL(20,2) NULL,
      rank_of_shareholding INT NULL,
      score_model1 DECIMAL(10,6) NULL,
      prediction_model1 TINYINT NULL,
      Target_encoded INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_outreach_triplet (account_hash_key, proposal_master_skey, director_master_skey),
      INDEX idx_outreach_hash (account_hash_key),
      INDEX idx_outreach_pm (proposal_master_skey),
      INDEX idx_outreach_dm (director_master_skey)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  db.query(createAccountsTable, (err) => {
    if (err) console.error('Error creating accounts table:', err);
    else console.log('Accounts table ready');
  });

  db.query(createOutreachLogsTable, (err) => {
    if (err) console.error('Error creating outreach_logs table:', err);
    else console.log('Outreach logs table ready');
  });

  db.query(createOutreachTable, (err) => {
    if (err) console.error('Error creating outreach table:', err);
    else console.log('Outreach table ready (schema aligned with account_unvoted)');

    // Simple migration: Check if table has new schema, if not recreate it
    db.query("SHOW COLUMNS FROM outreach LIKE 'account_hash_key'", (err, checkResult) => {
      if (err) {
        console.log('Migration check failed:', err.message);
        return;
      }
      
      if (checkResult.length === 0) {
        console.log('Outreach table needs schema migration - recreating...');
        
        // Backup any existing data first
        db.query('SELECT * FROM outreach', (err, backupData) => {
          if (err) {
            console.log('No existing data to backup');
            backupData = [];
          } else {
            console.log(`Backing up ${backupData.length} existing outreach records`);
          }
          
          // Drop and recreate with new schema
          db.query('DROP TABLE IF EXISTS outreach', (err) => {
            if (err) {
              console.log('Error dropping outreach table:', err.message);
              return;
            }
            
            const newTableSQL = `
              CREATE TABLE outreach (
                id INT AUTO_INCREMENT PRIMARY KEY,
                row_index INT NULL,
                unnamed_col VARCHAR(255) NULL,
                account_hash_key VARCHAR(255) NOT NULL,
                proposal_master_skey BIGINT NULL,
                director_master_skey BIGINT NULL,
                account_type VARCHAR(100) NULL,
                shares_summable DECIMAL(20,2) NULL,
                rank_of_shareholding INT NULL,
                score_model1 DECIMAL(10,6) NULL,
                prediction_model1 TINYINT NULL,
                Target_encoded INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_outreach_triplet (account_hash_key, proposal_master_skey, director_master_skey),
                INDEX idx_outreach_hash (account_hash_key),
                INDEX idx_outreach_pm (proposal_master_skey),
                INDEX idx_outreach_dm (director_master_skey)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            db.query(newTableSQL, (err) => {
              if (err) {
                console.log('Error recreating outreach table:', err.message);
              } else {
                console.log('Outreach table recreated with account_unvoted-compatible schema');
              }
            });
          });
        });
      }
    });
  });
}

// Routes

// Get all accounts
app.get('/api/accounts', (req, res) => {
  const { status, voting_status } = req.query;
  let query = 'SELECT * FROM accounts';
  let queryParams = [];

  if (status || voting_status) {
    query += ' WHERE';
    const conditions = [];
    
    if (status) {
      conditions.push(' outreach_status = ?');
      queryParams.push(status);
    }
    
    if (voting_status) {
      conditions.push(' voting_status = ?');
      queryParams.push(voting_status);
    }
    
    query += conditions.join(' AND');
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching accounts:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

// Get single account
app.get('/api/accounts/:id', (req, res) => {
  const accountId = req.params.id;
  
  db.query('SELECT * FROM accounts WHERE account_id = ?', [accountId], (err, results) => {
    if (err) {
      console.error('Error fetching account:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    
    res.json(results[0]);
  });
});

// Create new account
app.post('/api/accounts', (req, res) => {
  const {
    account_id,
    account_name,
    voting_status,
    contact_email,
    contact_phone,
    outreach_status,
    notes
  } = req.body;

  const query = `
    INSERT INTO accounts (account_id, account_name, voting_status, contact_email, contact_phone, outreach_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [account_id, account_name, voting_status, contact_email, contact_phone, outreach_status, notes], (err, result) => {
    if (err) {
      console.error('Error creating account:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.status(201).json({ message: 'Account created successfully', id: result.insertId });
  });
});

// Update account
app.put('/api/accounts/:id', (req, res) => {
  const accountId = req.params.id;
  const {
    account_name,
    voting_status,
    contact_email,
    contact_phone,
    outreach_status,
    last_contact_date,
    notes
  } = req.body;

  const query = `
    UPDATE accounts 
    SET account_name = ?, voting_status = ?, contact_email = ?, contact_phone = ?, 
        outreach_status = ?, last_contact_date = ?, notes = ?
    WHERE account_id = ?
  `;

  db.query(query, [account_name, voting_status, contact_email, contact_phone, outreach_status, last_contact_date, notes, accountId], (err, result) => {
    if (err) {
      console.error('Error updating account:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    
    res.json({ message: 'Account updated successfully' });
  });
});

// Delete account
app.delete('/api/accounts/:id', (req, res) => {
  const accountId = req.params.id;
  
  db.query('DELETE FROM accounts WHERE account_id = ?', [accountId], (err, result) => {
    if (err) {
      console.error('Error deleting account:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    
    res.json({ message: 'Account deleted successfully' });
  });
});

// Upload and import CSV/Excel files
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  if (fileExtension === '.csv') {
    importCSV(filePath, res);
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    importExcel(filePath, res);
  } else {
    res.status(400).json({ error: 'Unsupported file format. Please upload CSV or Excel files.' });
  }
});

// Import CSV function
function importCSV(filePath, res) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      insertAccountData(results, res);
      // Clean up uploaded file
      fs.unlinkSync(filePath);
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      res.status(500).json({ error: 'Error processing CSV file' });
    });
}

// Import Excel function
function importExcel(filePath, res) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const results = XLSX.utils.sheet_to_json(sheet);
    
    insertAccountData(results, res);
    // Clean up uploaded file
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Error reading Excel:', err);
    res.status(500).json({ error: 'Error processing Excel file' });
  }
}

// Insert account data from imported files
function insertAccountData(data, res) {
  let imported = 0;
  let errors = 0;

  data.forEach((row, index) => {
    // Map common column names (adjust based on your CSV structure)
    const account_id = row.account_id || row.Account_ID || row.id;
    const account_name = row.account_name || row.Account_Name || row.name;
    const voting_status = row.voting_status || (row.voted ? 'voted' : 'unvoted');
    const contact_email = row.contact_email || row.email;
    const contact_phone = row.contact_phone || row.phone;

    if (!account_id) {
      errors++;
      return;
    }

    const query = `
      INSERT INTO accounts (account_id, account_name, voting_status, contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      account_name = VALUES(account_name),
      voting_status = VALUES(voting_status),
      contact_email = VALUES(contact_email),
      contact_phone = VALUES(contact_phone)
    `;

    db.query(query, [account_id, account_name, voting_status, contact_email, contact_phone], (err, result) => {
      if (err) {
        console.error(`Error inserting row ${index}:`, err);
        errors++;
      } else {
        imported++;
      }

      // Send response when all rows are processed
      if (imported + errors === data.length) {
        res.json({
          message: `Import completed. ${imported} records imported, ${errors} errors.`,
          imported,
          errors
        });
      }
    });
  });
}

// Get outreach logs
app.get('/api/outreach-logs', (req, res) => {
  const query = `
    SELECT ol.*, a.account_name 
    FROM outreach_logs ol
    LEFT JOIN accounts a ON ol.account_id = a.account_id
    ORDER BY ol.contact_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching outreach logs:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

// Add outreach log
app.post('/api/outreach-logs', (req, res) => {
  const { account_id, contact_method, contact_date, outcome, notes } = req.body;

  const query = `
    INSERT INTO outreach_logs (account_id, contact_method, contact_date, outcome, notes)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [account_id, contact_method, contact_date, outcome, notes], (err, result) => {
    if (err) {
      console.error('Error creating outreach log:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    // Update last contact date in accounts table
    db.query('UPDATE accounts SET last_contact_date = ? WHERE account_id = ?', [contact_date, account_id]);
    
    res.status(201).json({ message: 'Outreach log created successfully', id: result.insertId });
  });
});

// Get dashboard statistics
app.get('/api/dashboard', (req, res) => {
  const queries = {
    totalProposals: 'SELECT COUNT(*) as count FROM proposals_predictions',
    correctPredictions: 'SELECT COUNT(*) as count FROM proposals_predictions WHERE prediction_correct = true',
    approvedProposals: 'SELECT COUNT(*) as count FROM proposals_predictions WHERE approved = true',
    votedAccounts: 'SELECT COUNT(*) as count FROM account_voted',
    unvotedAccounts: 'SELECT COUNT(*) as count FROM account_unvoted'
  };

  const results = {};
  let completed = 0;

  Object.keys(queries).forEach(key => {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error(`Error in ${key} query:`, err);
        results[key] = 0;
      } else {
        results[key] = result[0].count;
      }
      completed++;
      if (completed === Object.keys(queries).length) {
        res.json(results);
      }
    });
  });
});

// Get proposals predictions
app.get('/api/proposals', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  let whereClause = '';
  const conditions = [];
  
  if (req.query.prediction_correct) {
    conditions.push(`prediction_correct = ${req.query.prediction_correct === 'true' ? 'true' : 'false'}`);
  }
  
  if (req.query.approved) {
    conditions.push(`approved = ${req.query.approved === 'true' ? 'true' : 'false'}`);
  }
  
  if (req.query.category) {
    conditions.push(`category = '${req.query.category.replace(/'/g, "''")}'`);
  }
  
  if (req.query.search) {
    const search = req.query.search.replace(/'/g, "''");
    conditions.push(`(issuer_name LIKE '%${search}%' OR proposal LIKE '%${search}%' OR final_key LIKE '%${search}%')`);
  }
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM proposals_predictions ${whereClause}`;
  
  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error('Error counting proposals:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const total = countResult[0].total;
    
  // Get proposals data (all columns)
  const dataQuery = `
      SELECT *
      FROM proposals_predictions 
      ${whereClause}
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    db.query(dataQuery, (err, results) => {
      if (err) {
        console.error('Error fetching proposals:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        proposals: results,
        pagination: {
          current_page: page,
          per_page: limit,
          total: total,
          total_pages: Math.ceil(total / limit)
        }
      });
    });
  });
});

// Get unique categories for filter
app.get('/api/proposals/categories', (req, res) => {
  const query = 'SELECT DISTINCT category FROM proposals_predictions WHERE category IS NOT NULL ORDER BY category';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const categories = results.map(row => row.category);
    res.json(categories);
  });
});

// Fetch accounts related to a proposal_master_skey or director_master_skey
app.get('/api/proposal-accounts', (req, res) => {
  const pm = typeof req.query.proposal_master_skey !== 'undefined' ? parseInt(req.query.proposal_master_skey, 10) : null;
  const dm = typeof req.query.director_master_skey !== 'undefined' ? parseInt(req.query.director_master_skey, 10) : null;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '1000', 10);
  const offset = (page - 1) * limit;

  if ((pm === null || isNaN(pm)) && (dm === null || isNaN(dm))) {
    return res.status(400).json({ error: 'Provide proposal_master_skey or director_master_skey' });
  }

  // Choose key and build WHERE clause
  let whereClause = '';
  if (pm !== null && !isNaN(pm) && pm !== -1) {
    whereClause = `proposal_master_skey = ${pm}`;
  } else if (dm !== null && !isNaN(dm) && dm !== -1) {
    whereClause = `director_master_skey = ${dm}`;
  } else {
    return res.status(400).json({ error: 'No valid key provided' });
  }

  // Count total for both tables
  const countVotedQ = `SELECT COUNT(*) as total FROM account_voted WHERE ${whereClause}`;
  const countUnvotedQ = `SELECT COUNT(*) as total FROM account_unvoted WHERE ${whereClause}`;

  db.query(countVotedQ, (err, votedCountResult) => {
    if (err) {
      console.error('Error counting voted accounts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const totalVoted = votedCountResult[0].total || 0;

    db.query(countUnvotedQ, (err, unvotedCountResult) => {
      if (err) {
        console.error('Error counting unvoted accounts:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      const totalUnvoted = unvotedCountResult[0].total || 0;

      // Fetch paginated rows from both tables
      const votedQ = `SELECT * FROM account_voted WHERE ${whereClause} ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
      const unvotedQ = `SELECT * FROM account_unvoted WHERE ${whereClause} ORDER BY id LIMIT ${limit} OFFSET ${offset}`;

      db.query(votedQ, (err, votedRows) => {
        if (err) {
          console.error('Error fetching voted accounts:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        db.query(unvotedQ, (err, unvotedRows) => {
          if (err) {
            console.error('Error fetching unvoted accounts:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Check which unvoted accounts already exist in outreach table
          if (unvotedRows.length > 0) {
            const unvotedHashKeys = unvotedRows.map(row => row.account_hash_key).filter(key => key);
            
            if (unvotedHashKeys.length > 0) {
              const outreachCheckPlaceholders = unvotedHashKeys.map(() => '?').join(',');
              const outreachCheckQ = `
                SELECT account_hash_key, proposal_master_skey, director_master_skey 
                FROM outreach 
                WHERE account_hash_key IN (${outreachCheckPlaceholders}) AND ${whereClause}
              `;
              
              db.query(outreachCheckQ, [...unvotedHashKeys, pm || dm], (err, outreachRows) => {
                if (err) {
                  console.error('Error checking outreach status:', err);
                  // Continue without outreach status if there's an error
                  sendResponse(votedRows, unvotedRows, []);
                } else {
                  sendResponse(votedRows, unvotedRows, outreachRows);
                }
              });
            } else {
              sendResponse(votedRows, unvotedRows, []);
            }
          } else {
            sendResponse(votedRows, unvotedRows, []);
          }
        });
      });

      function sendResponse(votedRows, unvotedRows, outreachRows) {
        // Create a Set of composite keys for quick lookup
        const outreachKeys = new Set(
          outreachRows.map(row => `${row.account_hash_key}_${row.proposal_master_skey}_${row.director_master_skey}`)
        );

        // Add in_outreach flag to each unvoted account
        const enrichedUnvotedRows = unvotedRows.map(row => {
          const compositeKey = `${row.account_hash_key}_${row.proposal_master_skey}_${row.director_master_skey}`;
          return {
            ...row,
            in_outreach: outreachKeys.has(compositeKey)
          };
        });

        res.json({
          voted: votedRows,
          unvoted: enrichedUnvotedRows,
          pagination: {
            page: page,
            per_page: limit,
            voted: {
              total: totalVoted,
              total_pages: Math.ceil(totalVoted / limit)
            },
            unvoted: {
              total: totalUnvoted,
              total_pages: Math.ceil(totalUnvoted / limit)
            }
          }
        });
      }
    });
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;

// Bulk add selected unvoted accounts to outreach (store full unvoted row). Composite unique: (account_hash_key, proposal_master_skey, director_master_skey)
app.post('/api/outreach/bulk-add', (req, res) => {
  console.log('=== Bulk-add outreach request ===');
  console.log('req.body:', JSON.stringify(req.body, null, 2));
  
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  console.log('accounts array length:', accounts.length);
  console.log('accounts sample:', accounts.slice(0, 2));
  
  if (!accounts.length) return res.status(400).json({ error: 'No accounts provided' });

  // Determine key context (proposal_master_skey or director_master_skey)
  const sample = accounts.find(a => a && (a.key_param || a.keyParam));
  let keyParam = req.body.key_param || req.body.keyParam || (sample ? (sample.key_param || sample.keyParam) : null);
  let keyValue = req.body.key_value ?? req.body.keyValue ?? (sample ? (sample.key_value ?? sample.keyValue) : null);
  
  console.log('keyParam:', keyParam, 'keyValue:', keyValue);

  if (!keyParam || (keyValue === undefined || keyValue === null || keyValue === '')) {
    return res.status(400).json({ error: 'Missing key_param/key_value context' });
  }
  if (keyParam !== 'proposal_master_skey' && keyParam !== 'director_master_skey') {
    return res.status(400).json({ error: 'Invalid key_param. Use proposal_master_skey or director_master_skey' });
  }

  // Collect account_hash_key values (accept legacy field name account_id as fallback)
  const hashKeysRaw = accounts.map(a => (a && (a.account_hash_key || a.accountHashKey || a.account_id || a.id)) ? String(a.account_hash_key || a.accountHashKey || a.account_id || a.id) : '').filter(v => v && v.trim() !== '');
  const hashKeysSet = new Set(hashKeysRaw);
  const hashKeys = Array.from(hashKeysSet);
  console.log('hashKeysRaw:', hashKeysRaw);
  console.log('hashKeys:', hashKeys);
  
  if (!hashKeys.length) return res.status(400).json({ error: 'No account_hash_key values provided' });

  const placeholders = hashKeys.map(() => '?').join(',');
  const whereKeyClause = `${keyParam} = ?`;

  const countSql = `SELECT COUNT(*) AS cnt FROM account_unvoted WHERE account_hash_key IN (${placeholders}) AND ${whereKeyClause}`;
  const insertSql = `
    INSERT IGNORE INTO outreach (
      row_index, unnamed_col, account_hash_key, proposal_master_skey, director_master_skey,
      account_type, shares_summable, rank_of_shareholding, score_model1, prediction_model1, Target_encoded
    )
    SELECT 
      row_index, unnamed_col, account_hash_key, proposal_master_skey, director_master_skey,
      account_type, shares_summable, rank_of_shareholding, score_model1, prediction_model1, Target_encoded
    FROM account_unvoted
    WHERE account_hash_key IN (${placeholders}) AND ${whereKeyClause}
  `;

  const params = [...hashKeys, keyValue];

  db.query(countSql, params, (err, countRows) => {
    if (err) {
      console.error('Error counting account_unvoted for outreach insert:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const toSelect = (countRows && countRows[0] && countRows[0].cnt) ? Number(countRows[0].cnt) : 0;

    // First, get detailed info about what will be inserted vs what already exists
    const detailSql = `
      SELECT 
        u.account_hash_key, 
        u.proposal_master_skey, 
        u.director_master_skey,
        u.shares_summable,
        CASE WHEN o.account_hash_key IS NOT NULL THEN 1 ELSE 0 END as already_exists
      FROM account_unvoted u
      LEFT JOIN outreach o ON (
        u.account_hash_key = o.account_hash_key AND 
        u.proposal_master_skey = o.proposal_master_skey AND 
        u.director_master_skey = o.director_master_skey
      )
      WHERE u.account_hash_key IN (${placeholders}) AND u.${whereKeyClause}
    `;

    db.query(detailSql, params, (err, detailRows) => {
      if (err) {
        console.error('Error getting detail info for outreach insert:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const toInsert = detailRows.filter(row => !row.already_exists);
      const duplicates = detailRows.filter(row => row.already_exists);
      
      // Calculate total shares for accounts being added
      const totalShares = toInsert.reduce((sum, row) => sum + (parseFloat(row.shares_summable) || 0), 0);

      db.query(insertSql, params, (e2, result) => {
        if (e2) {
          console.error('Error inserting into outreach from account_unvoted:', e2);
          return res.status(500).json({ error: 'Database error' });
        }
        
        const inserted = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
        
        // Generate duplicate messages
        const duplicateMessages = duplicates.map(row => 
          `account_hash_key(${row.account_hash_key})+proposal_master_skey(${row.proposal_master_skey})+director_master_skey(${row.director_master_skey}) is not inserted because it is already in outreach table`
        );

        res.json({ 
          inserted, 
          skipped: duplicates.length,
          totalShares: totalShares,
          duplicateMessages: duplicateMessages
        });
      });
    });
  });
});

// List all outreach records (identical schema to account_unvoted)
app.get('/api/outreach', (req, res) => {
  const sql = `
    SELECT *
    FROM outreach
    ORDER BY created_at DESC, id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching outreach records:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});
