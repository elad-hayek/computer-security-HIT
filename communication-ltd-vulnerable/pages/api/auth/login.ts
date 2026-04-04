import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  hashPasswordVulnerable,
  buildVulnerableLoginQuery,
  comparePasswordsVulnerable,
} from "@/lib/auth";
import sql from "mssql";

type ResponseData = {
  success: boolean;
  message: string;
  user?: any;
  vulnerable_info?: string;
};

/**
 * VULNERABLE Login API Endpoint
 * POST /api/auth/login
 *
 * VULNERABILITY #1: SQL INJECTION
 * This endpoint is vulnerable to SQL injection attacks!
 *
 * ATTACK EXAMPLES:
 * 1. Bypass authentication:
 *    username: "admin' --"
 *    password: anything
 *    Query becomes: SELECT * FROM Users WHERE username = 'admin' --' AND password_hash = '...'
 *    The "--" comments out the password check!
 *
 * 2. OR condition trick:
 *    username: "' OR '1'='1' --"
 *    password: anything
 *    Query becomes: SELECT * FROM Users WHERE username = '' OR '1'='1' --' AND password_hash = '...'
 *    Always true, returns first user (often admin)!
 *
 * 3. Union-based injection:
 *    username: "' UNION SELECT 1,2,3,4,5,6 --"
 *    Can extract data from other tables
 *
 * WHY THIS IS BAD: Complete authentication bypass, data breach, account takeover
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password required" });
  }

  try {
    // VULNERABLE: Plain text password (from registration)
    const passwordHash = hashPasswordVulnerable(password, "");

    // VULNERABLE: Build query with string concatenation
    // This allows SQL injection!
    // Attack: username = "admin' OR '1'='1' --"
    // Result: SELECT * FROM Users WHERE username = 'admin' OR '1'='1' --' AND password_hash = '...'
    const query = buildVulnerableLoginQuery(username, passwordHash);

    console.log("[DEBUG - VULNERABLE] Executing query:", query);
    console.log("[WARNING] Next to query:", query);

    const pool = await getConnection();

    // VULNERABLE: Direct string query with concatenation
    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      // VULNERABLE: Doesn't check if attack was successful
      // Attacker using "admin' --" might get admin account
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
        vulnerable_info:
          'Try attack: username="admin\' --" to see SQL injection in action',
      });
    }

    const user = result.recordset[0];

    // VULNERABLE: No rate limiting on failed attempts
    // Account not locked after multiple failed logins
    // Attacker can brute force passwords

    return res.status(200).json({
      success: true,
      message: `Login successful for user '${user.username}' (VULNERABLE VERSION)`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      vulnerable_info: `[VULNERABLE] Logged in user: ${user.username}. Try SQL injection: admin' --`,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // VULNERABLE: Reveals too much information
    // Helps attackers understand database structure
    return res.status(500).json({
      success: false,
      message: "Login failed: " + error.message,
    });
  }
}
