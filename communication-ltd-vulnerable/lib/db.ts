import sql from "mssql";

// VULNERABLE VERSION - Direct string concatenation (for demonstration)
// This module shows VULNERABLE practices for educational purposes

const config = {
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_DATABASE || "Communication_LTD",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  port: parseInt(process.env.DB_PORT || "1433"),
  connectionTimeout: 30000,
  requestTimeout: 30000,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create database connection pool
 * WHY THIS MATTERS: Connection pooling reuses connections instead of creating new ones
 * This improves performance and resource management
 */
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      console.log("✓ Database connected successfully");
    } catch (error) {
      console.error("✗ Database connection failed:", error);
      throw error;
    }
  }
  return pool;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    const result = await conn.request().query("SELECT 1 as test");
    console.log("✓ Database test query successful: ", result.recordset);
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
 */
export async function queryVulnerable(query: string): Promise<any> {
  try {
    const conn = await getConnection();
    const result = await conn.request().query(query);
    return result.recordset;
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
