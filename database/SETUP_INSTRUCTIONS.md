# Database Setup Instructions

## Prerequisites

- SQL Server 2019 or later (Express, Developer, or full editions)
- SQL Server Management Studio (SSMS) or Azure Data Studio
- Local SQL instance running (default: `localhost` or `.\` for named instance)

## Step 1: Create the Database

### Option A: Using SQL Server Management Studio (SSMS)

1. Open **SQL Server Management Studio**
2. Connect to your local SQL Server instance
3. Open the file: `schema.sql` (File → Open → File)
4. Execute the script (Ctrl+Shift+E or Query → Execute)
5. **Verify:** In Object Explorer, expand **Databases** and look for `Communication_LTD`

### Option B: Using Command Line (sqlcmd)

```powershell
sqlcmd -S localhost -U sa -P "YourPassword" -i ".\schema.sql"
```

### Option C: Using Azure Data Studio

1. Open **Azure Data Studio**
2. Connect to your SQL Server instance
3. File → Open → Select `schema.sql`
4. Execute (Ctrl+Shift+E)

## Step 2: Verify Schema Creation

In SSMS or Azure Data Studio, run:

```sql
USE Communication_LTD;
GO

-- List all tables
SELECT * FROM sys.tables;

-- Verify PasswordPolicies table has default row
SELECT * FROM PasswordPolicies;

-- Check Users table structure
EXEC sp_columns Users;

-- Check Customers table structure
EXEC sp_columns Customers;
```

Expected Result:

- 4 tables: Users, Customers, PasswordPolicies, PasswordResetTokens
- Indexes created on key columns
- Default password policy inserted

## Step 3: Configure .env.local Files

Create `.env.local` file in **both projects**:

### File: `communication-ltd-vulnerable/.env.local`

```
DB_SERVER=localhost
DB_DATABASE=Communication_LTD
DB_USER=sa
DB_PASSWORD=YourSqlPassword
DB_PORT=1433
CONFIG_PASSWORD_MIN_LENGTH=10
CONFIG_PASSWORD_REQUIRE_UPPERCASE=true
CONFIG_PASSWORD_REQUIRE_LOWERCASE=true
CONFIG_PASSWORD_REQUIRE_DIGITS=true
CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS=true
CONFIG_PASSWORD_HISTORY_COUNT=3
CONFIG_MAX_LOGIN_ATTEMPTS=3
```

### File: `communication-ltd-secure/.env.local`

```
DB_SERVER=localhost
DB_DATABASE=Communication_LTD
DB_USER=sa
DB_PASSWORD=YourSqlPassword
DB_PORT=1433
CONFIG_PASSWORD_MIN_LENGTH=10
CONFIG_PASSWORD_REQUIRE_UPPERCASE=true
CONFIG_PASSWORD_REQUIRE_LOWERCASE=true
CONFIG_PASSWORD_REQUIRE_DIGITS=true
CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS=true
CONFIG_PASSWORD_HISTORY_COUNT=3
CONFIG_MAX_LOGIN_ATTEMPTS=3
```

## Step 4: Test Connection from Node.js

Once `.env.local` is configured, test the connection:

```javascript
const sql = require("mssql");

const config = {
  server: "localhost",
  database: "Communication_LTD",
  user: "sa",
  password: "YourPassword",
  port: 1433,
  options: { encrypt: true, trustServerCertificate: true },
};

sql.connect(config, (err) => {
  if (err) console.log("Connection failed:", err);
  else console.log("Connection successful!");
});
```

## Troubleshooting

### Error: "Cannot connect to localhost, 1433"

- **Solution:** Verify SQL Server is running: Services → SQL Server (MSSQLSERVER)
- **Alternative:** Use full instance name: `localhost\SQLEXPRESS` if using Express edition

### Error: "Login failed for user 'sa'"

- **Solution:** Verify SQL Server Authentication is enabled (not Windows-only)
- Steps: SSMS → Properties → Server → Security → SQL Server and Windows Authentication

### Error: "Database 'Communication_LTD' does not exist"

- **Solution:** Run the schema.sql script again
- Check that no errors occurred during execution

### Error: "Connection timeout"

- **Solution:** Allow SQL Server through Windows Firewall
  - Or add `Encrypt=true; TrustServerCertificate=true;` to connection string

## Connection String Reference

| Component         | Value                          |
| ----------------- | ------------------------------ |
| Server            | localhost (or 127.0.0.1)       |
| Database          | Communication_LTD              |
| User              | sa (SQL Server Authentication) |
| Port              | 1433 (default)                 |
| Encryption        | true                           |
| Trust Certificate | true (for development)         |

## Next Steps

1. Ensure `.env.local` files are created in both projects
2. Run `npm install` in both projects
3. Run `npm run dev` to start development servers
4. Navigate to `http://localhost:3000` (or 3001 for second project)
5. Test the registration flow

## Database Backup

To backup the database (optional):

```sql
BACKUP DATABASE Communication_LTD
TO DISK = 'C:\Backups\Communication_LTD.bak';
```

## Reset Database

To reset and start fresh:

```sql
USE master;
GO
DROP DATABASE Communication_LTD;
GO
-- Then re-run schema.sql
```
