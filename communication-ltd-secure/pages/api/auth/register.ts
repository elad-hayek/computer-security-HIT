import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  comparePasswordsSecure,
  generateSalt,
} from "@/lib/auth";
import { getPasswordConfig, isWeakPassword } from "@/lib/passwordConfig";
import { escape as htmlEscape } from "html-escaper";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * SECURE Registration API Endpoint
 * POST /api/auth/register
 *
 * This endpoint demonstrates SECURE practices:
 * 1. Password hashing with bcryptjs (12 salt rounds)
 * 2. Parameterized queries prevent SQL Injection
 * 3. Proper error handling and validation
 * 4. Rate limiting ready (can be added)
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

  const { username, email, password, confirmPassword } = req.body;

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

  // SECURE: Check weak password dictionary
  if (config.dictionaryCheckEnabled && isWeakPassword(password)) {
    return res.status(400).json({
      success: false,
      message: htmlEscape("Password is too common. Please choose a more unique password."),
      errors: ["WEAK_PASSWORD"]
    });
  }

  try {
    // SECURE: Hash password with bcryptjs (salt included in hash)
    // WHY: Bcryptjs uses adaptive hashing resistant to brute force
    const passwordHash = await hashPasswordSecure(password);
    const salt = generateSalt(); // Not strictly needed with bcryptjs, but keeping for schema

    // SECURE: Use parameterized query
    const query = `INSERT INTO Users (username, email, password_hash, salt, created_date) 
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;

    const db = await getConnection();

    // SECURE: Execute query with parameters
    // SQLite treats ? as placeholder, parameters are passed separately
    await db.run(query, [username, email, passwordHash, salt]);

    return res.status(201).json({
      success: true,
      message: `User '${username}' registered successfully (SECURE VERSION)`,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // Check if it's a duplicate username/email error
    await request.query(query);

    return res.status(201).json({
      success: true,
      message: `User '${username}' registered successfully (SECURE VERSION)`,
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

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
}
