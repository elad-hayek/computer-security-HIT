import Database from "sqlite";

// VULNERABLE VERSION - Direct string concatenation (for demonstration)
// This module shows VULNERABLE practices for educational purposes

const DB_PATH = process.env.DB_PATH || "./data/communication_ltd.db";

let db: Database.Database | null = null;

/**
 * Get or create database connection
 * WHY THIS MATTERS: Maintains a single connection to SQLite database
 */
export async function getConnection(): Promise<Database.Database> {
  if (!db) {
    try {
      db = await Database.open(DB_PATH);
      // Enable foreign keys in SQLite (off by default)
      await db.run("PRAGMA foreign_keys = ON");
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
    await db.close();
    db = null;
  }
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    const result = await conn.get("SELECT 1 as test");
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
    const result = await conn.all(query);
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
