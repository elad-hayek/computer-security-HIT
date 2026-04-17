import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, runAsync, getAsync } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  addPasswordToHistory,
} from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { getPasswordConfig, isWeakPassword } from "@/lib/passwordConfig";
import { escape as htmlEscape } from "html-escaper";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * VULNERABLE Registration API Endpoint
 * POST /api/auth/register
 *
 * This endpoint demonstrates INSECURE practices:
 * 1. Plain-text password storage (NO hashing)
 * 2. Direct SQL string concatenation (SQL Injection vulnerability)
 * 3. No proper input validation/sanitization
 * 4. VULNERABLE PASSWORD HISTORY: String concatenation in PasswordHistory insert
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

  const {
    username,
    email,
    firstName,
    lastName,
    phone,
    password,
    confirmPassword,
  } = req.body;

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: htmlEscape("Missing required fields") });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: htmlEscape("Passwords do not match") });
  }

  // Get password policy from config file
  const config = getPasswordConfig();

  // Validate password policy
  const validation = validatePasswordPolicy(password, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape("Password does not meet requirements"),
      errors: validation.errors,
    });
  }

  // VULNERABLE: Dictionary check (but error is same as secure version)
  if (config.dictionaryCheckEnabled && isWeakPassword(password)) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(
        "Password is too common. Please choose a more unique password.",
      ),
      errors: ["WEAK_PASSWORD"],
    });
  }

  try {
    // VULNERABLE: Hash password using bcryptjs (same as secure)
    // The vulnerability is in the SQL queries, not password hashing
    const passwordHash = await hashPasswordSecure(password);

    // VULNERABLE: Build query with string concatenation - SQL INJECTION POSSIBLE
    // This allows SQL injection attacks!
    // Attack examples:
    //   username = "admin'); DROP TABLE Users; --"
    //   username = "' OR '1'='1'); INSERT INTO Users... --"
    // Also XSS via firstName:
    //   firstName = "<img src=x onerror='alert(1)'>"
    const query = `INSERT INTO Users (username, email, first_name, last_name, phone, password_hash, created_date) VALUES ('${username}', '${email}', '${firstName || ""}', '${lastName || ""}', '${phone || ""}', '${passwordHash}', CURRENT_TIMESTAMP)`;

    const db = await getConnection();

    // VULNERABLE: Direct string execution
    await runAsync(db, query);

    // Get the newly created user's ID (with SQL injection vulnerability)
    const userQuery = `SELECT id FROM Users WHERE username = '${username}'`; // VULNERABLE!
    const user = await getAsync(db, userQuery);

    if (user) {
      // VULNERABLE: Password history with SQL injection
      await addPasswordToHistory(user.id, passwordHash, db);

      // VULNERABLE: Set HTTP-only cookie (same as secure)
      setAuthCookie(res, user.id);
    }

    return res.status(201).json({
      success: true,
      message: `User '${username}' registered successfully`,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // Check if it's a duplicate username/email error
    if (
      error.message.includes("UNIQUE") ||
      error.message.includes("duplicate")
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Username or email already exists" });
    }

    // Generic error message (same as secure version)
    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
}
