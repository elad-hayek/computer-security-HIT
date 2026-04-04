import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
  generateSalt,
  buildVulnerableRegisterQuery,
} from "@/lib/auth";

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

  // Get password policy from environment
  const config = {
    minLength: parseInt(process.env.CONFIG_PASSWORD_MIN_LENGTH || "10"),
    requireUppercase: process.env.CONFIG_PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.CONFIG_PASSWORD_REQUIRE_LOWERCASE === "true",
    requireDigits: process.env.CONFIG_PASSWORD_REQUIRE_DIGITS === "true",
    requireSpecialChars:
      process.env.CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
  };

  // Validate password policy
  const validation = validatePasswordPolicy(password, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet requirements",
      errors: validation.errors,
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
    const query = buildVulnerableRegisterQuery(
      username,
      email,
      passwordHash,
      salt,
    );

    console.log("[DEBUG] Executing query:", query); // Dangerous - shows SQL

    const pool = await getConnection();

    // VULNERABLE: Direct string concatenation
    const result = await pool.request().query(query);

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
