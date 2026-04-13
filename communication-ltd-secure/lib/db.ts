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

// Export async wrapper functions for direct database operations
export { getAsync, runAsync, allAsync };
