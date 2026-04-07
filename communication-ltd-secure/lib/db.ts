import sqlite3 from "sqlite3";

// SECURE VERSION - Parameterized queries with SQLite
// This module shows SECURE practices for production use

const DB_PATH = process.env.DB_PATH || "./data/communication_ltd.db";

let db: sqlite3.Database | null = null;

// Helper functions to promisify sqlite3 callback-based API
function runAsync(
  database: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<{ lastID?: number; changes?: number }> {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(
  database: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<any> {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(
  database: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function openDatabase(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(database);
    });
  });
}

/**
 * Get or create database connection
 * WHY THIS MATTERS: Maintains a single connection to SQLite database
 * SQLite works better with a single persistent connection than connection pooling
 */
export async function getConnection(): Promise<sqlite3.Database> {
  if (!db) {
    try {
      db = await openDatabase(DB_PATH);
      // Enable foreign keys in SQLite (off by default)
      await runAsync(db, "PRAGMA foreign_keys = ON");
      console.log("Secure database connected successfully");
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }
  return db;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (db) {
    await new Promise<void>((resolve, reject) => {
      db!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    db = null;
  }
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    const result = await getAsync(conn, "SELECT 1 as test");
    console.log("✓ Secure database test query successful: ", result);
    return true;
  } catch (error) {
    console.error("✗ Database test query failed:", error);
    return false;
  }
}

/**
 * Type for query parameters in SQLite
 * SQLite accepts arrays for ? placeholders or objects for named parameters
 */
type QueryParams = (string | number | boolean | null)[] | Record<string, any>;

/**
 * SECURE: Execute a query with PARAMETERIZED values
 *
 * ⚠️ CRITICAL SECURITY CHECK:
 * This function prevents SQL INJECTION by:
 * 1. Using ? placeholders (NOT string concatenation)
 * 2. Passing parameters separately (NOT building SQL strings)
 * 3. SQLite automatically escapes and validates parameters
 *
 * VULNERABLE CODE EXAMPLE (DON'T DO THIS):
 * ❌ `SELECT * FROM Users WHERE username = '${username}'`
 * ✅ `SELECT * FROM Users WHERE username = ?` + [username]
 *
 * USAGE PATTERN:
 * const result = await querySecure(
 *   'SELECT * FROM Users WHERE username = ?',
 *   ['john']
 * );
 */
export async function querySecure(
  queryString: string,
  parameters?: QueryParams,
): Promise<any> {
  try {
    const conn = await getConnection();

    // Validate that parameters use ? placeholders (SECURE pattern)
    // This helps catch vulnerable code during development
    const placeholderCount = (queryString.match(/\?/g) || []).length;
    const paramCount = Array.isArray(parameters)
      ? parameters.length
      : Object.keys(parameters || {}).length;

    if (placeholderCount !== paramCount) {
      throw new Error(
        `Parameter mismatch: Query has ${placeholderCount} placeholders but ${paramCount} parameters provided`,
      );
    }

    // Execute query with parameters
    // SQLite automatically handles:
    // - String escaping (no SQL injection possible)
    // - Type binding (integers, strings, dates, etc.)
    // - NULL handling
    const result = await allAsync(
      conn,
      queryString,
      (Array.isArray(parameters)
        ? parameters
        : Object.values(parameters || {})) as any[],
    );
    return result;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

/**
 * SECURE: Execute a single row query (returns first result or null)
 *
 * USAGE PATTERN:
 * const user = await querySingleSecure(
 *   'SELECT * FROM Users WHERE id = ?',
 *   [userId]
 * );
 */
export async function querySingleSecure(
  queryString: string,
  parameters?: QueryParams,
): Promise<any> {
  try {
    const conn = await getConnection();
    const result = await getAsync(
      conn,
      queryString,
      (Array.isArray(parameters)
        ? parameters
        : Object.values(parameters || {})) as any[],
    );
    return result || null;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

/**
 * SECURE: Execute INSERT/UPDATE/DELETE (does not return rows)
 * Returns the result object with lastID and changes
 *
 * USAGE PATTERN:
 * const result = await executeSecure(
 *   'INSERT INTO Users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)',
 *   ['john', 'john@example.com', 'hashed_password', 'salt123']
 * );
 * console.log(result.lastID); // ID of inserted row
 */
export async function executeSecure(
  queryString: string,
  parameters?: QueryParams,
): Promise<{ lastID?: number; changes?: number }> {
  try {
    const conn = await getConnection();
    const result = await runAsync(
      conn,
      queryString,
      (Array.isArray(parameters)
        ? parameters
        : Object.values(parameters || {})) as any[],
    );
    return { lastID: result.lastID, changes: result.changes };
  } catch (error) {
    console.error("Execution error:", error);
    throw error;
  }
}

/**
 * SECURE: Execute multiple queries in a transaction
 * If any query fails, all are rolled back
 *
 * WHY THIS MATTERS: Transactions ensure data consistency
 *
 * USAGE PATTERN:
 * await transactionSecure(async (tx) => {
 *   await tx.run('INSERT INTO Users ...', params);
 *   await tx.run('INSERT INTO Customers ...', params);
 * });
 */
export async function transactionSecure(
  callback: (tx: sqlite3.Database) => Promise<void>,
): Promise<void> {
  try {
    const conn = await getConnection();
    await runAsync(conn, "BEGIN TRANSACTION");

    try {
      await callback(conn);
      await runAsync(conn, "COMMIT");
    } catch (error) {
      await runAsync(conn, "ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
}

// Export async wrapper functions for direct database operations
export { getAsync as get, runAsync as run, allAsync as all };

export default { getConnection, closeConnection, testConnection, querySecure };
