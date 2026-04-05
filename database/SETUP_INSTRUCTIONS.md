# Database Setup Instructions

## Overview

This project uses **SQLite** for the local development database. SQLite requires zero server setup—it's a file-based database that works instantly.

## Prerequisites

- Node.js 18+ installed
- That's it! SQLite is built into the Node.js runtime.

## Step 1: Initialize the Database

From the **project root directory**, run:

```bash
npm run db:init
```

This command:

- Creates the `data/` directory
- Generates `data/communication_ltd.db` (the SQLite database file)
- Populates the schema with 4 tables
- Inserts default data (PasswordPolicies and test user)

**Expected Output:**

```
✓ Created directory: data
✓ Opened database: ./data/communication_ltd.db
✓ Loaded schema file
✓ Database initialized successfully!
📊 Database location: ./data/communication_ltd.db

🎉 Setup complete! You can now run: npm run dev
```

## Step 2: Verify Schema Creation

Inspect the database file using SQLite CLI:

```bash
# Install sqlite3 CLI if needed (Windows):
# https://www.sqlite.org/download.html

# Or use this Node.js command to verify:
npx sqlite3 data/communication_ltd.db ".tables"
```

Expected Result:

```
Customers  PasswordPolicies  PasswordResetTokens  Users
```

To view the schema:

```bash
npx sqlite3 data/communication_ltd.db ".schema Users"
```

## Step 3: No `.env.local` Configuration Needed!

The `.env.local` files are **already created** with the correct SQLite path:

```env
# .env.local
DB_PATH=./data/communication_ltd.db
```

You can use this as-is. No modifications needed!

## Step 4: Test Connection from Node.js

Once the database is initialized, test the connection:

```bash
npm run dev
```

When each Next.js server starts, you'll see:

```
✓ Secure database connected successfully
```

## Troubleshooting

### Error: "Cannot find `data/communication_ltd.db`"

- **Solution:** Run `npm run db:init` first to create the database
- Verify the command executed without errors

### Error: "Database lock / busy"

- **Solution:** This rarely happens with SQLite. If it does:
  1. Restart the Node.js server
  2. Delete `data/*.db-wal` and `data/*.db-shm` files

### Error: "SQLITE_CANTOPEN"

- **Solution:** Ensure Node.js has write permissions to the `data/` directory
- Check that the `data/` directory exists: `ls data/` (or `dir data/` on Windows)

### Database file too large or corrupted

- **Solution:** Delete and recreate:
  ```bash
  npm run db:reset
  ```

## SQLite vs SQL Server: Why SQLite?

| Feature      | SQLite          | SQL Server      |
| ------------ | --------------- | --------------- |
| Setup Time   | < 1 second      | 30+ minutes     |
| Portability  | Single .db file | Requires server |
| For Learning | Perfect ✅      | Overkill        |
| Production   | Not ideal ❌    | Enterprise ✅   |

**For this educational project, SQLite is ideal!**

## Next Steps

1. ✅ Database initialized (`npm run db:init`)
2. Navigate to each project folder:
   ```bash
   cd communication-ltd-vulnerable
   npm install
   npm run dev
   ```
3. Test at `http://localhost:3000` (or 3001 for secure version)
4. Test the registration flow

## Database Inspection

### View all users:

```bash
npx sqlite3 data/communication_ltd.db "SELECT id, username, email FROM Users;"
```

### View all customers:

```bash
npx sqlite3 data/communication_ltd.db "SELECT * FROM Customers;"
```

### View password policies:

```bash
npx sqlite3 data/communication_ltd.db "SELECT * FROM PasswordPolicies;"
```

## Reset Database

To delete all data and start fresh:

```bash
npm run db:reset
```

This will:

1. Delete `data/communication_ltd.db`
2. Run `npm run db:init` to recreate with fresh schema

## Advanced: Direct SQLite Access

For deeper inspection or debugging, use the `sqlite3` CLI:

```bash
# Interactive mode
sqlite3 data/communication_ltd.db

# Inside sqlite3 shell:
.tables              -- List all tables
.schema Users        -- View Users table structure
SELECT * FROM Users; -- View all users
.exit                -- Exit sqlite3
```

## Database File Locations

- **Secure version:** `communication-ltd-secure/data/communication_ltd.db`
- **Vulnerable version:** `communication-ltd-vulnerable/data/communication_ltd.db`

Both versions use the **same database file**, so data is shared between them during development.

## Backing Up the Database

SQLite database files can be copied directly:

```bash
# Create a backup
cp data/communication_ltd.db data/communication_ltd.backup.db

# Restore from backup
cp data/communication_ltd.backup.db data/communication_ltd.db
```

## Summary

| Task                | Command                                        |
| ------------------- | ---------------------------------------------- |
| Initialize database | `npm run db:init`                              |
| Reset database      | `npm run db:reset`                             |
| Inspect with CLI    | `sqlite3 data/communication_ltd.db ".tables"`  |
| View schema         | `sqlite3 data/communication_ltd.db ".schema" ` |
| Backup database     | `cp data/communication_ltd.db data/backup.db`  |
