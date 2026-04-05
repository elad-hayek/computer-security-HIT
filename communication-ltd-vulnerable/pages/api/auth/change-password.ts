import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
} from "@/lib/auth";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * VULNERABLE Change Password API Endpoint
 * POST /api/auth/change-password
 *
 * VULNERABILITIES:
 * 1. No verification of old password
 * 2. No password history check (can reuse old passwords)
 * 3. SQL injection possible in queries
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

  const { userId, oldPassword, newPassword, confirmPassword } = req.body;

  if (!userId || !oldPassword || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "New passwords do not match" });
  }

  // Get password policy
  const config = {
    minLength: parseInt(process.env.CONFIG_PASSWORD_MIN_LENGTH || "10"),
    requireUppercase: process.env.CONFIG_PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.CONFIG_PASSWORD_REQUIRE_LOWERCASE === "true",
    requireDigits: process.env.CONFIG_PASSWORD_REQUIRE_DIGITS === "true",
    requireSpecialChars:
      process.env.CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
  };

  const validation = validatePasswordPolicy(newPassword, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "New password does not meet requirements",
      errors: validation.errors,
    });
  }

  try {
    const db = await getConnection();

    // VULNERABLE: No verification of old password!
    // An attacker could change anyone's password if they know the userId
    // VULNERABLE: Direct string concatenation possible
    const query = `SELECT id FROM Users WHERE id = ${userId}`;
    const userResult = await db.all(query);

    if (userResult.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // VULNERABLE: No password history check
    // User can reuse the same password immediately
    const newHash = hashPasswordVulnerable(newPassword, "");

    // VULNERABLE: Direct string concatenation
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${userId}`;

    await db.run(updateQuery);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully (VULNERABLE VERSION)",
    });
  } catch (error: any) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password: " + error.message,
    });
  }
}
