# Proxy Account Outreach Web Application

A comprehensive web application for managing proxy account outreach with MySQL database integration.

## Features

- **Dashboard**: Overview of account statistics and outreach progress
- **Account Management**: Add, edit, delete, and filter proxy accounts
- **Outreach Tracking**: Log and track all outreach activities
- **Data Import**: Import data from CSV and Excel files
- **Responsive UI**: Modern, mobile-friendly interface

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn package manager

## Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Create a MySQL database named `proxy_outreach`
   - Update the MySQL connection settings in `server.js`:
     ```javascript
     const db = mysql.createConnection({
       host: 'localhost',
       user: 'your_mysql_username',
       password: 'your_mysql_password',
       database: 'proxy_outreach'
     });
     ```
   - Run the database setup script:
     ```bash
     mysql -u your_username -p proxy_outreach < database_setup.sql
     ```

4. **Start the application**
   ```bash
   # For development with auto-restart
   npm run dev
   
   # For production
   npm start
   ```

5. **Access the application**
   Open your browser and go to `http://localhost:3000`

## Database Configuration

### MySQL Connection Settings

Edit the following section in `server.js`:

```javascript
const db = mysql.createConnection({
  host: 'localhost',      // Your MySQL host
  user: 'root',           // Your MySQL username
  password: 'password',   // Your MySQL password
  database: 'proxy_outreach'
});
```

### Database Tables

The application creates two main tables:

1. **accounts**: Stores proxy account information
   - account_id (unique identifier)
   - account_name
   - voting_status (voted/unvoted)
   - contact_email
   - contact_phone
   - outreach_status (pending/contacted/responded/completed)
   - last_contact_date
   - notes

## Usage

### Importing Data

The application supports importing data from:
- CSV files (.csv)
- Excel files (.xlsx, .xls)

**Expected CSV/Excel columns:**
- `account_id` or `Account_ID` or `id`
- `account_name` or `Account_Name` or `name`
- `voting_status` or `voted` (boolean)
- `contact_email` or `email`
- `contact_phone` or `phone`

### API Endpoints

The application provides a REST API:

- `GET /api/accounts` - Get all accounts (with filtering)
- `GET /api/accounts/:id` - Get specific account
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/outreach-logs` - Get all outreach logs
- `POST /api/outreach-logs` - Create outreach log
- `POST /api/upload` - Import data from file
- `GET /api/dashboard` - Get dashboard statistics

## File Structure

```
proxy_account_outreach/
├── server.js                 # Express server and API endpoints
├── package.json              # Node.js dependencies
├── database_setup.sql        # MySQL database setup
├── public/                   # Frontend files
│   ├── index.html           # Main HTML file
│   ├── styles.css           # CSS styles
│   └── script.js            # JavaScript functionality
├── uploads/                  # Temporary file uploads (auto-created)
└── README.md                # This file
```

## Development

### Adding New Features

1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Update `public/index.html`, `public/styles.css`, and `public/script.js`
3. **Database**: Add migrations or schema changes in SQL files

### Environment Configuration

For production deployment, consider using environment variables:

```javascript
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'proxy_outreach'
});
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check MySQL server is running
   - Verify connection credentials
   - Ensure database exists

2. **Import not working**
   - Check file format (CSV/Excel)
   - Verify column names match expected format
   - Check file permissions in uploads directory

3. **Port already in use**
   - Change the port in server.js or kill the process using port 3000

### Logs

Check the console output when running the server for detailed error messages.

## Documentation

- **[Docker Deployment](DOCKER.md)** - Complete containerization guide
- **[Docker Pre-loaded Database](DOCKER-PRELOADED.md)** - Fast startup with pre-loaded data
- **[Large File Management](LARGE_FILES.md)** - Git repository size management
- **[Development Setup](DATABASE.md)** - Database configuration and setup

## Security Notes

- Change default MySQL credentials
- Implement authentication for production use
- Sanitize user inputs
- Use HTTPS in production
- Restrict file upload types and sizes

## License

This project is open source and available under the MIT License.
