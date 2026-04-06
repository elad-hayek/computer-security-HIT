import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
  generateSalt,
} from "@/lib/auth";
import { getPasswordConfig, isWeakPassword } from "@/lib/passwordConfig";

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
 * 3. No proper error handling
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
      .json({ success: false, message: "Missing required fields" });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }

  // Get password policy from config file
  const config = getPasswordConfig();

  // Validate password policy
  const validation = validatePasswordPolicy(password, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet requirements",
      errors: validation.errors,
    });
  }

  // VULNERABLE: Shows dictionary check but API doesn't encode output (form does XSS)
  if (config.dictionaryCheckEnabled && isWeakPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password is too common. Please choose a more unique password.",
      errors: ["WEAK_PASSWORD"],
    });
  }

  try {
    // VULNERABLE: No password hashing - just use plain text
    // WHY THIS IS BAD: If DB is breached, all passwords are compromised
    const passwordHash = password; // VULNERABLE: Plain text!
    const salt = generateSalt();

    // VULNERABLE: Build query with string concatenation
    // WHY THIS IS BAD: SQL Injection attack possible
    // Example attack: username = "'); DROP TABLE Users; --"
    const query = `INSERT INTO Users (username, email, password_hash, salt, created_date) VALUES ('${username}', '${email}', '${passwordHash}', '${salt}', CURRENT_TIMESTAMP)`;

    console.log("[DEBUG] Executing query:", query); // Dangerous - shows SQL

    const db = await getConnection();

    // VULNERABLE: Direct string concatenation
    await db.run(query);

    return res.status(201).json({
      success: true,
      message: `User '${username}' registered successfully (VULNERABLE VERSION)`,
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
      message: "Registration failed: " + error.message,
    });
  }
}
