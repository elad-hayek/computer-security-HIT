import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, runAsync, getAsync } from "@/lib/db";
import {
  validatePasswordPolicy,
  checkPasswordDictionary,
  hashPasswordHMAC,
  generateSalt,
  addPasswordToHistory,
} from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { getPasswordConfig } from "@/lib/passwordConfig";
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
 * 1. Password hashing with HMAC-SHA256 (same secure hashing, no vulnerability here)
 * 2. Direct SQL string concatenation (SQL Injection vulnerability in INSERT and SELECT)
 * 3. No proper input validation/sanitization
 * 4. VULNERABLE PASSWORD HISTORY: String concatenation in PasswordHistory insert
 * 5. SQL injection can be exploited via username, email, firstName, lastName, phone, or salt fields
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: htmlEscape("Invalid email format") });
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

  // VULNERABLE: Check password dictionary
  const dictionaryCheck = checkPasswordDictionary(password);
  if (dictionaryCheck.isWeak) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(
        dictionaryCheck.suggestion || "Password validation failed",
      ),
      errors: ["WEAK_PASSWORD"],
    });
  }

  try {
    try {
      
      // VULNERABLE: Generate salt (same as secure version)
      // The vulnerability is in the SQL queries, not password hashing
      const salt = generateSalt();

      // VULNERABLE: Hash password using HMAC-SHA256 (same as secure)
      // The vulnerability is in the SQL queries, not password hashing
      const passwordHash = await hashPasswordHMAC(password, salt);

      // VULNERABLE: Build query with string concatenation - SQL INJECTION POSSIBLE
      // This allows SQL injection attacks!
      // Attack examples:
      //   username = "admin'); DROP TABLE Users; --"
      //   username = "' OR '1'='1'); INSERT INTO Users... --"
      //   firstName = "<img src=x onerror='alert(1)'>"
      //   salt or passwordHash could also be injected
      
      const db = await getConnection();
      
      const existingUserQuery = `SELECT id FROM Users WHERE username = '${username}' OR email = '${email}'`;
      const existingUser = await getAsync(db, existingUserQuery);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      const query = `INSERT INTO Users (username, email, first_name, last_name, phone, password_hash, salt, created_date) VALUES ('${username}', '${email}', '${firstName || ""}', '${lastName || ""}', '${phone || ""}', '${passwordHash}', '${salt}', CURRENT_TIMESTAMP)`;
      
      // VULNERABLE: Direct string execution
      await runAsync(db, query);

      // Get the newly created user's ID (with SQL injection vulnerability)
      const userQuery = `SELECT id FROM Users WHERE username = '${username}'`; // VULNERABLE!
      const user = await getAsync(db, userQuery);

      if (user) {
        // VULNERABLE: Password history with SQL injection
        await addPasswordToHistory(user.id, passwordHash, salt, db);

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
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      // Generic error message (same as secure version)
      return res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  } finally {
    await closeConnection();
  }
}
