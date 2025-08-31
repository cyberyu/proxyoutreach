const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration for issuer filtering
app.use(session({
  secret: 'proxy-outreach-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
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

// Current database tracking
let currentDatabase = 'proxy';

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

// Helper function to build issuer filter for queries
function buildIssuerFilter(req, tableAlias = '') {
  const selectedIssuers = req.session.selectedIssuers;
  if (!selectedIssuers || selectedIssuers.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const placeholders = selectedIssuers.map(() => '?').join(',');
  
  // For tables that join with proposals_predictions
  const whereClause = `AND EXISTS (
    SELECT 1 FROM proposals_predictions pp 
    WHERE (pp.proposal_master_skey = ${prefix}proposal_master_skey 
           OR pp.director_master_skey = ${prefix}director_master_skey)
    AND pp.issuer_name IN (${placeholders})
  )`;
  
  return { whereClause, params: selectedIssuers };
}

// Initialize database and tables
function initializeDatabase() {
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

// Insert account data from imported files - DEPRECATED: accounts table removed
function insertAccountData(data, res) {
  // Accounts table has been removed - return an error message
  res.status(400).json({
    error: 'Account import functionality has been removed. Please use the specialized data import endpoints.',
    message: 'The accounts table functionality has been deprecated.',
    imported: 0,
    errors: data.length
  });
}

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
  const params = [];
  
  if (req.query.prediction_correct) {
    conditions.push(`prediction_correct = ?`);
    params.push(req.query.prediction_correct === 'true' ? 1 : 0);
  }
  
  if (req.query.approved) {
    conditions.push(`approved = ?`);
    params.push(req.query.approved === 'true' ? 1 : 0);
  }
  
  if (req.query.category) {
    conditions.push(`category = ?`);
    params.push(req.query.category);
  }
  
  if (req.query.search) {
    conditions.push(`(issuer_name LIKE ? OR proposal LIKE ? OR final_key LIKE ?)`);
    const searchTerm = `%${req.query.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  // Add issuer filter
  const selectedIssuers = req.session.selectedIssuers;
  if (selectedIssuers && selectedIssuers.length > 0) {
    const placeholders = selectedIssuers.map(() => '?').join(',');
    conditions.push(`issuer_name IN (${placeholders})`);
    params.push(...selectedIssuers);
  }
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM proposals_predictions ${whereClause}`;
  
  db.query(countQuery, params, (err, countResult) => {
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
      LIMIT ? OFFSET ?
    `;
    
    const queryParams = [...params, limit, offset];
    
    db.query(dataQuery, queryParams, (err, results) => {
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
        },
        issuer_filter: {
          active: selectedIssuers && selectedIssuers.length > 0,
          selected_issuers: selectedIssuers || [],
          count: selectedIssuers ? selectedIssuers.length : 0
        }
      });
    });
  });
});

// Get unique categories for filter
app.get('/api/proposals/categories', (req, res) => {
  let whereClause = '';
  const params = [];
  
  // Add issuer filter
  const selectedIssuers = req.session.selectedIssuers;
  if (selectedIssuers && selectedIssuers.length > 0) {
    const placeholders = selectedIssuers.map(() => '?').join(',');
    whereClause = `WHERE issuer_name IN (${placeholders})`;
    params.push(...selectedIssuers);
  }
  
  const query = `SELECT DISTINCT category FROM proposals_predictions ${whereClause} AND category IS NOT NULL ORDER BY category`;
  
  db.query(query, params, (err, results) => {
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
  
  // Support separate pagination for voted and unvoted accounts
  const votedPage = parseInt(req.query.voted_page || req.query.page || '1', 10);
  const unvotedPage = parseInt(req.query.unvoted_page || req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '1000', 10);
  
  const votedOffset = (votedPage - 1) * limit;
  const unvotedOffset = (unvotedPage - 1) * limit;

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
  
  // Calculate total shares for both tables
  const totalVotedSharesQ = `SELECT SUM(CAST(shares_summable AS DECIMAL(20,2))) as total_shares FROM account_voted WHERE ${whereClause} AND shares_summable IS NOT NULL`;
  const totalUnvotedSharesQ = `SELECT SUM(CAST(shares_summable AS DECIMAL(20,2))) as total_shares FROM account_unvoted WHERE ${whereClause} AND shares_summable IS NOT NULL`;
  
  // Calculate For/Against breakdown for voted accounts
  const votedForSharesQ = `SELECT SUM(CAST(shares_summable AS DECIMAL(20,2))) as for_shares FROM account_voted WHERE ${whereClause} AND shares_summable IS NOT NULL AND (prediction_model2 = 0 OR prediction_model2 = '0' OR prediction_model2 = false)`;
  const votedAgainstSharesQ = `SELECT SUM(CAST(shares_summable AS DECIMAL(20,2))) as against_shares FROM account_voted WHERE ${whereClause} AND shares_summable IS NOT NULL AND (prediction_model2 = 1 OR prediction_model2 = '1' OR prediction_model2 = true)`;

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

      // Get total shares for both tables
      db.query(totalVotedSharesQ, (err, votedSharesResult) => {
        if (err) {
          console.error('Error calculating total voted shares:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        const totalVotedShares = votedSharesResult[0].total_shares || 0;

        db.query(totalUnvotedSharesQ, (err, unvotedSharesResult) => {
          if (err) {
            console.error('Error calculating total unvoted shares:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          const totalUnvotedShares = unvotedSharesResult[0].total_shares || 0;

          // Get For/Against breakdown for voted accounts
          db.query(votedForSharesQ, (err, votedForResult) => {
            if (err) {
              console.error('Error calculating voted For shares:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            const totalVotedForShares = votedForResult[0].for_shares || 0;

            db.query(votedAgainstSharesQ, (err, votedAgainstResult) => {
              if (err) {
                console.error('Error calculating voted Against shares:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              const totalVotedAgainstShares = votedAgainstResult[0].against_shares || 0;

              // Fetch paginated rows from both tables with separate pagination
              const votedQ = `SELECT * FROM account_voted WHERE ${whereClause} ORDER BY id LIMIT ${limit} OFFSET ${votedOffset}`;
              const unvotedQ = `SELECT * FROM account_unvoted WHERE ${whereClause} ORDER BY id LIMIT ${limit} OFFSET ${unvotedOffset}`;

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

        // Add in_outreach flag to each unvoted account only (voted accounts should never have outreach functionality)
        const enrichedUnvotedRows = unvotedRows.map(row => {
          const compositeKey = `${row.account_hash_key}_${row.proposal_master_skey}_${row.director_master_skey}`;
          return {
            ...row,
            in_outreach: outreachKeys.has(compositeKey)
          };
        });

        res.json({
          voted: votedRows.map(row => {
            // Ensure voted accounts never have in_outreach property
            const { in_outreach, ...cleanRow } = row;
            return cleanRow;
          }),
          unvoted: enrichedUnvotedRows,
          pagination: {
            per_page: limit,
            voted: {
              current_page: votedPage,
              total: totalVoted,
              total_pages: Math.ceil(totalVoted / limit)
            },
            unvoted: {
              current_page: unvotedPage,
              total: totalUnvoted,
              total_pages: Math.ceil(totalUnvoted / limit)
            }
          },
          totals: {
            voted_shares: totalVotedShares,
            unvoted_shares: totalUnvotedShares,
            voted_for_shares: totalVotedForShares,
            voted_against_shares: totalVotedAgainstShares
          }
        });
      }
            });
          });
        });
      });
    });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ========== ADMIN API ENDPOINTS ==========

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === '12345678') {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Admin authenticated' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin authentication required' });
  }
}

// Get database statistics
app.get('/api/admin/database-stats', requireAdmin, async (req, res) => {
  try {
    const stats = {};
    
    // Get voted accounts count
    const [votedResult] = await db.promise().query('SELECT COUNT(*) as count FROM account_voted');
    stats.voted_count = votedResult[0].count;
    
    // Get unvoted accounts count  
    const [unvotedResult] = await db.promise().query('SELECT COUNT(*) as count FROM account_unvoted');
    stats.unvoted_count = unvotedResult[0].count;
    
    // Calculate total accounts
    stats.total_accounts = stats.voted_count + stats.unvoted_count;
    
    // Get proposals count
    const [proposalsResult] = await db.promise().query('SELECT COUNT(DISTINCT proposal_master_skey) as count FROM proposals_predictions');
    stats.proposals = proposalsResult[0].count;
    
    // Get database size
    const [sizeResult] = await db.promise().query(`
      SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    stats.database_size = `${sizeResult[0].size_mb || 0} MB`;
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting database statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive database management endpoint (no backup tables)
app.get('/api/admin/manage-database', requireAdmin, async (req, res) => {
  try {
    const result = {
      databases: [],
      tables: [],
      summary: {},
      currentDatabase: currentDatabase
    };
    // Get list of available databases (all five proxy databases)
    const availableDatabases = ['proxy', 'proxy_sds', 'proxy_sds_calibrated', 'proxy_sel', 'proxy_sel_calibrated'];
    // Get information for all databases
    for (const dbName of availableDatabases) {
      const [sizeResult] = await db.promise().query(`
        SELECT CAST(ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS DECIMAL(10,2)) AS size_mb 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [dbName]);
      result.databases.push({
        name: dbName,
        size_mb: sizeResult[0].size_mb || 0,
        current: dbName === currentDatabase
      });
    }
    // Get table information for currently selected database, excluding backup tables
    const [tables] = await db.promise().query(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_ROWS as table_rows,
        CAST(ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS DECIMAL(10,2)) AS size_mb,
        ENGINE as engine,
        TABLE_COMMENT as table_comment
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME NOT LIKE '%backup%'
      ORDER BY TABLE_NAME
    `, [currentDatabase]);
    result.tables = tables;
    // Calculate summary statistics for current database (no backup tables)
    const totalSizeSum = tables.reduce((sum, table) => {
      const size = parseFloat(table.size_mb) || 0;
      return sum + size;
    }, 0);
    result.summary = {
      total_tables: tables.length,
      total_records: tables.reduce((sum, table) => sum + (table.table_rows || 0), 0),
      total_size_mb: parseFloat(totalSizeSum.toFixed(2)),
      data_tables: tables.length,
      backup_tables: 0,
      connections: null
    };
    res.json(result);
  } catch (error) {
    console.error('Error getting database management info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set target database endpoint
app.post('/api/admin/set-database', requireAdmin, async (req, res) => {
  try {
    const { database } = req.body;
    
    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }
    
    // Validate database name (allow all five proxy databases)
    const allowedDatabases = ['proxy', 'proxy_sds', 'proxy_sds_calibrated', 'proxy_sel', 'proxy_sel_calibrated'];
    if (!allowedDatabases.includes(database)) {
      return res.status(400).json({ error: 'Invalid database name. Allowed: ' + allowedDatabases.join(', ') });
    }
    
    // Test connection to the target database
    const testConnection = mysql.createConnection({
      host: 'localhost',
      user: 'webapp',
      password: 'webapppass',
      database: database
    });
    
    // Test the connection
    await new Promise((resolve, reject) => {
      testConnection.connect((err) => {
        if (err) {
          testConnection.destroy();
          reject(err);
        } else {
          testConnection.end();
          resolve();
        }
      });
    });
    
    // Update current database tracking
    currentDatabase = database;
    
    // Switch the main connection to the new database
    db.changeUser({ database: database }, (err) => {
      if (err) {
        console.error('Error switching database:', err);
        return res.status(500).json({ error: 'Failed to switch database: ' + err.message });
      }
      
      console.log(`Database switched to: ${database}`);
      res.json({ 
        success: true, 
        currentDatabase: database,
        message: `Successfully switched to database: ${database}`
      });
    });
    
  } catch (error) {
    console.error('Error setting target database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get issuer list
app.get('/api/admin/issuer-list', requireAdmin, async (req, res) => {
  try {
    // Get all unique issuers from proposals_predictions table
    const [issuers] = await db.promise().query(`
      SELECT 
        issuer_name as name,
        COUNT(DISTINCT proposal_master_skey) as proposal_count,
        COUNT(DISTINCT director_master_skey) as director_count,
        'active' as status
      FROM proposals_predictions 
      WHERE issuer_name IS NOT NULL AND issuer_name != ''
      GROUP BY issuer_name
      ORDER BY issuer_name
    `);
    
    // Add selection status based on session
    const selectedIssuers = req.session.selectedIssuers || [];
    const issuersWithSelection = issuers.map(issuer => ({
      ...issuer,
      selected: selectedIssuers.includes(issuer.name)
    }));
    
    res.json({ 
      issuers: issuersWithSelection,
      totalIssuers: issuers.length,
      selectedCount: selectedIssuers.length
    });
  } catch (error) {
    console.error('Error getting issuer list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get issuer list (frontend-compatible endpoint)
app.get('/api/admin/issuers', requireAdmin, async (req, res) => {
  try {
    // Get all unique issuers from proposals_predictions table
    const [issuers] = await db.promise().query(`
      SELECT 
        issuer_name,
        COUNT(DISTINCT proposal_master_skey) as proposal_count
      FROM proposals_predictions 
      WHERE issuer_name IS NOT NULL AND issuer_name != ''
      GROUP BY issuer_name
      ORDER BY issuer_name
    `);
    
    res.json(issuers);
  } catch (error) {
    console.error('Error getting issuer list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply issuer filter
app.post('/api/admin/apply-issuer-filter', requireAdmin, async (req, res) => {
  try {
    const { issuers } = req.body;
    
    if (!Array.isArray(issuers)) {
      return res.status(400).json({ error: 'issuers must be an array' });
    }
    
    // Store selected issuers in session for filtering
    req.session.selectedIssuers = issuers;
    
    console.log('Applied issuer filter:', issuers);
    
    res.json({ 
      message: `Filter applied to ${issuers.length} issuers`,
      selectedIssuers: issuers,
      count: issuers.length
    });
  } catch (error) {
    console.error('Error applying issuer filter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set selected issuers
app.post('/api/admin/set-selected-issuers', requireAdmin, (req, res) => {
  try {
    const { selectedIssuers } = req.body;
    
    if (!Array.isArray(selectedIssuers)) {
      return res.status(400).json({ error: 'selectedIssuers must be an array' });
    }
    
    req.session.selectedIssuers = selectedIssuers;
    
    res.json({ 
      message: 'Selected issuers updated successfully',
      selectedIssuers: selectedIssuers,
      count: selectedIssuers.length
    });
  } catch (error) {
    console.error('Error setting selected issuers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current selected issuers
app.get('/api/admin/selected-issuers', (req, res) => {
  try {
    const selectedIssuers = req.session.selectedIssuers || [];
    res.json({ selectedIssuers, count: selectedIssuers.length });
  } catch (error) {
    console.error('Error getting selected issuers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export database (create backup)
app.post('/api/admin/export-database', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `proxy_backup_${timestamp}.sql`;
    
    // Note: This is a simplified version. In production, you'd use mysqldump
    res.json({ 
      message: 'Database export feature would create: ' + filename,
      note: 'This feature requires mysqldump implementation'
    });
  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear database (with extreme caution)
app.post('/api/admin/clear-database', async (req, res) => {
  try {
    // This is dangerous - in production, add proper authentication
    await db.promise().query('DELETE FROM outreach');
    await db.promise().query('DELETE FROM account_voted');
    await db.promise().query('DELETE FROM account_unvoted');
    
    res.json({ message: 'All data cleared from database' });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get application logs (simplified)
app.get('/api/admin/logs', (req, res) => {
  try {
    // In a real application, you'd read from log files
    const logs = `
Application Logs (Last 10 entries):
${new Date().toISOString()} - Server started
${new Date().toISOString()} - Database connected
${new Date().toISOString()} - Admin panel accessed
    `.trim();
    
    res.json({ logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      if (err) {
        console.error('Error counting account_unvoted for outreach insert:', err);
        return res.status(500).json({ error: 'Database error' });
      }
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

      // Dynamically determine which columns exist in both outreach and account_unvoted
      db.query('SHOW COLUMNS FROM outreach', (err, outreachColsRows) => {
        if (err) {
          console.error('Error fetching outreach columns:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        const outreachCols = outreachColsRows.map(r => r.Field).filter(c => c !== 'id' && c !== 'created_at');

        db.query('SHOW COLUMNS FROM account_unvoted', (err, unvotedColsRows) => {
          if (err) {
            console.error('Error fetching account_unvoted columns:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          const unvotedCols = unvotedColsRows.map(r => r.Field);

          // Intersection of columns, preserving outreach column order
          const commonCols = outreachCols.filter(c => unvotedCols.includes(c));

          if (!commonCols.length) {
            console.error('No common columns found between outreach and account_unvoted');
            return res.status(500).json({ error: 'Schema mismatch: no common columns to copy' });
          }

          const insertCols = commonCols.map(col => `\`${col}\``).join(', ');
          const selectCols = commonCols.map(col => `u.\`${col}\``).join(', ');

          const insertSqlDynamic = `INSERT IGNORE INTO outreach (${insertCols}) SELECT ${selectCols} FROM account_unvoted u WHERE account_hash_key IN (${placeholders}) AND u.${whereKeyClause}`;

          db.query(insertSqlDynamic, params, (e2, result) => {
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

// --- Download Example Format Endpoint ---
app.get('/api/download-example/:type', (req, res) => {
  const type = req.params.type;
  
  // Generate example data based on type
  let data, filename, contentType;
  
  if (type === 'proposal') {
    // Generate example proposal data
    const headers = [
      'proposal_master_skey', 'director_master_skey', 'final_key', 'job_number', 'issuer_name',
      'service', 'cusip6', 'mt_date', 'ml_date', 'record_date', 'mgmt_rec', 'proposal',
      'proposal_type', 'director_number', 'director_name', 'Category', 'Subcategory',
      'predicted_for_shares', 'predicted_against_shares', 'predicted_abstain_shares',
      'predicted_unvoted_shares', 'total_for_shares', 'total_against_shares', 'total_abstain_shares',
      'total_unvoted_shares', 'ForRatioAmongVoted', 'ForRatioAmongElig', 'VotingRatio',
      'ForRatioAmongVoted_true', 'ForRatioAmongElig_true', 'VotingRatio_true',
      'ForRatioAmongVotedInclAbs', 'ForRatioAmongEligInclAbs', 'VotingRatioInclAbs',
      'ForRatioAmongVotedInclAbs_true', 'ForRatioAmongEligInclAbs_true', 'VotingRatioInclAbs_true',
      'For %', 'Against %', 'Abstain %', 'For % True', 'Against % True', 'Abstain % True',
      'prediction_correct', 'approved', 'For (%) - From Prospectus 2026 File',
      'Against (%) - From Prospectus 2026 File', 'Abstain/Withhold (%) - From Prospectus 2026 File'
    ];
    
    const sampleRows = [];
    for (let i = 1; i <= 100; i++) {
      sampleRows.push([
        10000 + i, 20000 + i, `FK${i}`, `JOB${i}`, `Sample Company ${i}`,
        'Proxy Services', `CUS${i.toString().padStart(3, '0')}`, '2025-01-15', '2025-02-15', '2025-01-01',
        'FOR', `Proposal ${i}`, 'Governance', i, `Director ${i}`, 'Board', 'Election',
        Math.random() * 1000000, Math.random() * 100000, Math.random() * 50000,
        Math.random() * 200000, Math.random() * 1200000, Math.random() * 150000, Math.random() * 60000,
        Math.random() * 250000, Math.random(), Math.random(), Math.random(),
        Math.random(), Math.random(), Math.random(),
        Math.random(), Math.random(), Math.random(),
        Math.random(), Math.random(), Math.random(),
        Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(),
        Math.random() > 0.5, Math.random() > 0.5, Math.random(), Math.random(), Math.random()
      ]);
    }
    
    // Create Excel workbook
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposals');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    filename = 'example_proposal_data.xlsx';
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    data = buffer;
    
  } else if (type === 'unvoted') {
    // Generate example unvoted accounts data
    const headers = [
      'row_index', 'unnamed_col', 'account_hash_key', 'proposal_master_skey', 'director_master_skey',
      'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model1', 'prediction_model1', 'Target_encoded'
    ];
    
    const csvRows = [headers.join(',')];
    for (let i = 1; i <= 100; i++) {
      csvRows.push([
        i,
        `unvoted_${i}`,
        `HASH${i.toString().padStart(8, '0')}`,
        10000 + i,
        20000 + i,
        ['Individual', 'Institution', 'Mutual Fund'][i % 3],
        Math.floor(Math.random() * 100000),
        Math.floor(Math.random() * 1000) + 1,
        Math.random(),
        Math.random() > 0.5 ? 1 : 0,
        Math.floor(Math.random() * 2)
      ].join(','));
    }
    
    data = csvRows.join('\n');
    filename = 'example_unvoted_accounts.csv';
    contentType = 'text/csv';
    
  } else if (type === 'voted') {
    // Generate example voted accounts data
    const headers = [
      'row_index', 'unnamed_col', 'account_hash_key', 'proposal_master_skey', 'director_master_skey',
      'account_type', 'shares_summable', 'rank_of_shareholding', 'score_model2', 'prediction_model2', 'Target_encoded'
    ];
    
    const csvRows = [headers.join(',')];
    for (let i = 1; i <= 100; i++) {
      csvRows.push([
        i,
        `voted_${i}`,
        `HASH${i.toString().padStart(8, '0')}`,
        10000 + i,
        20000 + i,
        ['Individual', 'Institution', 'Mutual Fund'][i % 3],
        Math.floor(Math.random() * 100000),
        Math.floor(Math.random() * 1000) + 1,
        Math.random(),
        Math.random() > 0.5 ? 1 : 0,
        Math.floor(Math.random() * 2)
      ].join(','));
    }
    
    data = csvRows.join('\n');
    filename = 'example_voted_accounts.csv';
    contentType = 'text/csv';
    
  } else {
    return res.status(400).json({ error: 'Invalid type. Use proposal, unvoted, or voted.' });
  }
  
  // Set headers for download
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data);
});

// --- Data Format Validation Endpoint ---
const { v4: uuidv4 } = require('uuid');
const mysql2 = require('mysql2/promise');

app.post('/api/validate-import', upload.single('file'), async (req, res) => {
  const type = req.query.type;
  if (!req.file || !type) {
    return res.status(400).json({ error: 'File and type are required' });
  }
  const filePath = req.file.path;
  let schema, tableName, parseExcel = false;
  // Define schemas
  if (type === 'proposal') {
    tableName = 'proposals_predictions';
    parseExcel = true;
    schema = [
      { name: 'proposal_master_skey', type: 'int' },
      { name: 'director_master_skey', type: 'int' },
      { name: 'final_key', type: 'string' },
      { name: 'job_number', type: 'string' },
      { name: 'issuer_name', type: 'string' },
      { name: 'service', type: 'string' },
      { name: 'cusip6', type: 'string' },
      { name: 'mt_date', type: 'date' },
      { name: 'ml_date', type: 'date' },
      { name: 'record_date', type: 'date' },
      { name: 'mgmt_rec', type: 'string' },
      { name: 'proposal', type: 'string' },
      { name: 'proposal_type', type: 'string' },
      { name: 'director_number', type: 'int' },
      { name: 'director_name', type: 'string' },
      { name: 'Category', type: 'string' },
      { name: 'Subcategory', type: 'string' },
      { name: 'predicted_for_shares', type: 'float' },
      { name: 'predicted_against_shares', type: 'float' },
      { name: 'predicted_abstain_shares', type: 'float' },
      { name: 'predicted_unvoted_shares', type: 'float' },
      { name: 'total_for_shares', type: 'float' },
      { name: 'total_against_shares', type: 'float' },
      { name: 'total_abstain_shares', type: 'float' },
      { name: 'total_unvoted_shares', type: 'float' },
      { name: 'ForRatioAmongVoted', type: 'float' },
      { name: 'ForRatioAmongElig', type: 'float' },
      { name: 'VotingRatio', type: 'float' },
      { name: 'ForRatioAmongVoted_true', type: 'float' },
      { name: 'ForRatioAmongElig_true', type: 'float' },
      { name: 'VotingRatio_true', type: 'float' },
      { name: 'ForRatioAmongVotedInclAbs', type: 'float' },
      { name: 'ForRatioAmongEligInclAbs', type: 'float' },
      { name: 'VotingRatioInclAbs', type: 'float' },
      { name: 'ForRatioAmongVotedInclAbs_true', type: 'float' },
      { name: 'ForRatioAmongEligInclAbs_true', type: 'float' },
      { name: 'VotingRatioInclAbs_true', type: 'float' },
      { name: 'For %', type: 'float' },
      { name: 'Against %', type: 'float' },
      { name: 'Abstain %', type: 'float' },
      { name: 'For % True', type: 'float' },
      { name: 'Against % True', type: 'float' },
      { name: 'Abstain % True', type: 'float' },
      { name: 'prediction_correct', type: 'bool' },
      { name: 'approved', type: 'bool' },
      { name: 'For (%) - From Prospectus 2026 File', type: 'float' },
      { name: 'Against (%) - From Prospectus 2026 File', type: 'float' },
      { name: 'Abstain/Withhold (%) - From Prospectus 2026 File', type: 'float' }
    ];
  } else if (type === 'unvoted') {
    tableName = 'account_unvoted';
    schema = [
      { name: 'row_index', type: 'int' },
      { name: 'unnamed_col', type: 'string' },
      { name: 'account_hash_key', type: 'string' },
      { name: 'proposal_master_skey', type: 'int' },
      { name: 'director_master_skey', type: 'int' },
      { name: 'account_type', type: 'string' },
      { name: 'shares_summable', type: 'float' },
      { name: 'rank_of_shareholding', type: 'int' },
      { name: 'score_model1', type: 'float' },
      { name: 'prediction_model1', type: 'int' },
      { name: 'Target_encoded', type: 'int' }
    ];
  } else if (type === 'voted') {
    tableName = 'account_voted';
    schema = [
      { name: 'row_index', type: 'int' },
      { name: 'unnamed_col', type: 'string' },
      { name: 'account_hash_key', type: 'string' },
      { name: 'proposal_master_skey', type: 'int' },
      { name: 'director_master_skey', type: 'int' },
      { name: 'account_type', type: 'string' },
      { name: 'shares_summable', type: 'float' },
      { name: 'rank_of_shareholding', type: 'int' },
      { name: 'score_model2', type: 'float' },
      { name: 'prediction_model2', type: 'int' },
      { name: 'Target_encoded', type: 'int' }
    ];
  } else {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Invalid type' });
  }

  // Parse file
  let rows = [];
  let errors = [];
  try {
    if (parseExcel) {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } else {
      // CSV
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',');
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        let row = {};
        headers.forEach((h, idx) => row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : null);
        rows.push(row);
      }
    }
  } catch (e) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Failed to parse file: ' + e.message });
  }

  // Validate columns
  const requiredCols = schema.map(s => s.name);
  const fileCols = rows[0] ? Object.keys(rows[0]) : [];
  const missingCols = requiredCols.filter(c => !fileCols.includes(c));
  const extraCols = fileCols.filter(c => !requiredCols.includes(c));
  if (missingCols.length > 0) errors.push('Missing columns: ' + missingCols.join(', '));
  if (extraCols.length > 0) errors.push('Extra columns: ' + extraCols.join(', '));

  // Validate datatypes (check first 10 rows)
  function checkType(val, type) {
    if (val === null || val === undefined || val === '') return true;
    if (type === 'int') return /^-?\d+$/.test(val) || (!isNaN(val) && Number.isInteger(Number(val)));
    if (type === 'float') return !isNaN(val) && isFinite(val);
    if (type === 'string') return typeof val === 'string' || typeof val === 'number';
    if (type === 'bool') return val === true || val === false || val === 0 || val === 1 || val === '0' || val === '1' || val === 'true' || val === 'false';
    if (type === 'date') return !isNaN(Date.parse(val));
    return true;
  }
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    schema.forEach(col => {
      if (!checkType(row[col.name], col.type)) {
        errors.push(`Row ${i+2} column '${col.name}' expected ${col.type}, got '${row[col.name]}'`);
      }
    });
  }

  // If errors, return
  if (errors.length > 0) {
    fs.unlinkSync(filePath);
    return res.json({ valid: false, errors });
  }

  // Try ingesting into a temp MySQL database
  const tempDb = 'tmp_validate_' + uuidv4().replace(/-/g, '').slice(0, 12);
  let conn;
  try {
    conn = await mysql2.createConnection({
      host: 'localhost',
      user: 'webapp',
      password: 'webapppass',
      multipleStatements: true
    });
    await conn.query(`CREATE DATABASE \`${tempDb}\``);
    await conn.query(`USE \`${tempDb}\``);
    // Build CREATE TABLE
    const colDefs = schema.map(col => {
      if (col.type === 'int') return `\`${col.name}\` INT`;
      if (col.type === 'float') return `\`${col.name}\` DECIMAL(20,6)`;
      if (col.type === 'bool') return `\`${col.name}\` TINYINT`;
      if (col.type === 'date') return `\`${col.name}\` DATE`;
      return `\`${col.name}\` VARCHAR(255)`;
    });
    await conn.query(`CREATE TABLE \`${tableName}\` (${colDefs.join(', ')})`);
    // Insert sample rows
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      const vals = schema.map(col => row[col.name]);
      const placeholders = vals.map(() => '?').join(',');
      await conn.query(`INSERT INTO \`${tableName}\` (${schema.map(c => `\`${c.name}\``).join(',')}) VALUES (${placeholders})`, vals);
    }
    await conn.query(`DROP DATABASE \`${tempDb}\``);
    fs.unlinkSync(filePath);
    return res.json({ valid: true, errors: [] });
  } catch (e) {
    if (conn) try { await conn.query(`DROP DATABASE \`${tempDb}\``); } catch {}
    fs.unlinkSync(filePath);
    return res.json({ valid: false, errors: ['MySQL ingest error: ' + e.message] });
  }
});
