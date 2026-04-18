import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, allAsync } from "@/lib/db";
import { comparePasswordsSecure } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";

type ResponseData = {
  success: boolean;
  message: string;
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
    try {
      // VULNERABLE: Hash password using bcryptjs (same as secure)
      // Passwords are hashed, but the query is vulnerable to SQL injection
      const db = await getConnection();

      // VULNERABLE: Build query with string concatenation - SQL INJECTION POSSIBLE
      // This allows SQL injection attacks!
      // Attack examples:
      //   username = "admin' --" bypasses password check
      //   username = "' OR '1'='1' --" returns first user (often admin)
      const query = `SELECT * FROM Users WHERE username = '${username}'`;

      // VULNERABLE: Direct string query with concatenation
      const result = await allAsync(db, query);

      if (result.length === 0) {
        // Generic error message (same as secure version)
        // Note: Attackers can still use SQL injection to bypass this
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const user = result[0];

      // FIXED: Now using proper bcryptjs comparison instead of hashing in the query
      // This prevents the logic bug that made login impossible
      const passwordMatch = await comparePasswordsSecure(
        password,
        user.password_hash,
      );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // VULNERABLE: Set HTTP-only cookie (same mechanism as secure)
      // The vulnerability is in the query, not the cookie handling
      setAuthCookie(res, user.id);

      return res.status(200).json({
        success: true,
        message: "Login successful",
      });
    } catch (error: any) {
      console.error("Login error:", error);

      // Generic error message (same as secure version)
      // Don't reveal database details
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  } finally {
    await closeConnection();
  }
}
