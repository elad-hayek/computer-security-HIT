import sqlite3 from "sqlite3";

// VULNERABLE VERSION - Direct string concatenation (for demonstration)
// This module shows VULNERABLE practices for educational purposes

const DB_PATH = process.env.DB_PATH || "./data/communication_ltd.db";

let db: sqlite3.Database | null = null;

// Helper functions to promisify sqlite3 callback-based API
function runAsync(
  database: sqlite3.Database,
  sql: string,
): Promise<{ lastID?: number; changes?: number }> {
  return new Promise((resolve, reject) => {
    database.run(sql, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(database: sqlite3.Database, sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    database.get(sql, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(database: sqlite3.Database, sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    database.all(sql, (err, rows) => {
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
 * Maintains a single connection to SQLite database
 */
export async function getConnection(): Promise<sqlite3.Database> {
  if (!db) {
    try {
      db = await openDatabase(DB_PATH);
      // Enable foreign keys in SQLite (off by default)
      await runAsync(db, "PRAGMA foreign_keys = ON");
      console.log("Database connected successfully");
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

export { getAsync, runAsync, allAsync };

export default {
  getConnection,
  closeConnection,
};
