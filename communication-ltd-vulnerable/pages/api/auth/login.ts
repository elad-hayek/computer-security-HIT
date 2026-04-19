import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, allAsync } from "@/lib/db";
import { hashPasswordHMAC } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * VULNERABLE Login API Endpoint
 * POST /api/auth/login
 *
 * VULNERABILITY #1: SQL INJECTION in password verification
 * This endpoint is vulnerable to SQL injection attacks through password_hash parameter!
 *
 * ATTACK FLOW:
 * 1. Username is fetched via string concatenation query (SQL injection possible here too)
 * 2. Password is hashed with retrieved salt
 * 3. Verification query uses string concatenation: WHERE username = '${username}' AND password_hash = '${computedHash}'
 * 4. Attacker can inject SQL through the computed hash to bypass authentication
 *
 * EXAMPLE ATTACK (sophisticated):
 * If hash contains: abc' OR '1'='1
 * Query becomes: SELECT * FROM Users WHERE username = 'admin' AND password_hash = 'abc' OR '1'='1'
 * The OR condition always evaluates to true, bypassing the hash check!
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
      const db = await getConnection();

      // VULNERABLE: Build query with string concatenation - SQL INJECTION POSSIBLE
      // This allows SQL injection attacks in the username parameter!
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

      // VULNERABLE: Hash password using HMAC with retrieved salt (same hashing as secure)
      // The vulnerability comes from the SQL query construction below, not the hashing
      const computedHash = await hashPasswordHMAC(password, user.salt);

      // VULNERABLE: Verification query uses string concatenation - SQL INJECTION POSSIBLE
      // If computedHash contains SQL injection payload, it can bypass password check
      // Example: if password produces hash like "abc' OR '1'='1", the query becomes:
      //   SELECT * FROM Users WHERE username = 'user' AND password_hash = 'abc' OR '1'='1'
      // This bypasses the password verification because OR '1'='1' is always true!
      const verifyQuery = `SELECT * FROM Users WHERE username = '${username}' AND password_hash = '${computedHash}'`;

      // VULNERABLE: Direct string query with concatenation
      const verifyResult = await allAsync(db, verifyQuery);

      if (verifyResult.length === 0) {
        // Password doesn't match
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
