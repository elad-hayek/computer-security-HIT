import sqlite3 from "sqlite3";

// VULNERABLE VERSION - Direct string concatenation (for demonstration)
// This module shows VULNERABLE practices for educational purposes

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
 */
export async function getConnection(): Promise<sqlite3.Database> {
  if (!db) {
    try {
      db = await openDatabase(DB_PATH);
      // Enable foreign keys in SQLite (off by default)
      await runAsync(db, "PRAGMA foreign_keys = ON");
      console.log("✓ Database connected successfully");
    } catch (error) {
      console.error("✗ Database connection failed:", error);
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
    console.log("✓ Database test query successful: ", result);
    return true;
  } catch (error) {
    console.error("✗ Database test query failed:", error);
    return false;
  }
}

/**
 * VULNERABLE: Execute query with string concatenation
 * WARNING: This is vulnerable to SQL Injection attacks!
 *
 * WHY THIS IS VULNERABLE:
 * - User input is directly concatenated into the SQL query
 * - An attacker can inject SQL code:
 *   Example: username = "admin' OR '1'='1"
 *   Results in: SELECT * FROM Users WHERE username = 'admin' OR '1'='1'
 *   Which will return ALL users instead of finding one user
 *
 * EDUCATIONAL PURPOSES ONLY - Do NOT use this pattern in production!
 * See the secure version (communication-ltd-secure/lib/db.ts) for proper parameterized queries
 */
export async function queryVulnerable(query: string): Promise<any> {
  try {
    const conn = await getConnection();
    // VULNERABLE: Direct SQL execution without parameterization
    // The query string is executed as-is without escaping or validation
    const result = await allAsync(conn, query);
    return result;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

export default {
  getConnection,
  closeConnection,
  testConnection,
  queryVulnerable,
};
