import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  generateSalt,
  addPasswordToHistory,
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
 * 3. Password history tracking in separate table
 * 4. Proper error handling and validation
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

  // SECURE: Check weak password dictionary
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
    const db = await getConnection();

    // SECURE: Hash password with bcryptjs
    const passwordHash = await hashPasswordSecure(password);
    const salt = generateSalt();

    // SECURE: Use parameterized query with new fields
    const query = `
      INSERT INTO Users (username, email, first_name, last_name, phone, password_hash, salt, created_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await db.run(query, [
      username,
      email,
      firstName || null,
      lastName || null,
      phone || null,
      passwordHash,
      salt,
    ]);

    // Get the newly created user's ID to add to password history
    const userQuery = `SELECT id FROM Users WHERE username = ?`;
    const user = await db.get(userQuery, [username]);

    if (user) {
      // Add initial password to history
      await addPasswordToHistory(user.id, passwordHash, db);
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

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
}
