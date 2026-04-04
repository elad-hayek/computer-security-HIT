import sql from "mssql";

// SECURE VERSION - Parameterized queries and proper error handling
// This module shows SECURE practices for production use

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
      console.log("✓ Secure database connected successfully");
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
    console.log("✓ Secure database test query successful: ", result.recordset);
    return true;
  } catch (error) {
    console.error("✗ Database test query failed:", error);
    return false;
  }
}

/**
 * SECURE: Execute query with parameterized queries
 * WHY THIS IS SECURE:
 * - Parameters are passed separately from the SQL query
 * - SQL Server treats them as data, not executable code
 * - Example: SELECT * FROM Users WHERE username = @username
 *   The @username parameter is treated as literal data, no matter what it contains
 * - This completely prevents SQL Injection attacks
 *
 * USAGE PATTERN:
 * const result = await querySecure(
 *   'SELECT * FROM Users WHERE username = @username',
 *   { username: 'john' }
 * );
 */
export async function querySecure(
  queryString: string,
  parameters?: Record<string, any>,
): Promise<any> {
  try {
    const conn = await getConnection();
    const request = conn.request();

    // Add parameters to the query
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        // sql.NVarChar for strings, sql.Int for numbers, etc.
        if (typeof value === "string") {
          request.input(key, sql.NVarChar, value);
        } else if (typeof value === "number") {
          request.input(key, sql.Int, value);
        } else if (typeof value === "boolean") {
          request.input(key, sql.Bit, value);
        } else if (value instanceof Date) {
          request.input(key, sql.DateTime, value);
        } else {
          request.input(key, sql.NVarChar, JSON.stringify(value));
        }
      }
    }

    const result = await request.query(queryString);
    return result.recordset;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

export default { getConnection, closeConnection, testConnection, querySecure };
