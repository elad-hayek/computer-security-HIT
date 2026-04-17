import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
  checkPasswordHistory,
  addPasswordToHistory,
} from "@/lib/auth";
import { getAuthFromCookie } from "@/lib/cookies";
import { getPasswordConfig } from "@/lib/passwordConfig";

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
 * 1. No verification of old password - attackers can change any user's password
 * 2. Plain text password storage (no hashing)
 * 3. SQL injection in queries via string concatenation
 * 4. VULNERABLE PASSWORD HISTORY: Uses SQL injection in checkPasswordHistory function
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

  const { oldPassword, newPassword, confirmPassword } = req.body;

  // VULNERABLE: Extract userId from authentication cookie (not from request body)
  // Note: In this vulnerable version, we still verify old password like secure version
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "New passwords do not match" });
  }

  // Get password policy from config
  const config = getPasswordConfig();

  // Validate new password against policy
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

    // VULNERABLE: SQL injection via string concatenation
    // Even though userId is numeric from cookie, the pattern demonstrates vulnerability
    const userQuery = `SELECT id, password_hash FROM Users WHERE id = ${userId}`;

    const userResult = await db.get(userQuery);

    if (!userResult) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // VULNERABLE: Verify old password using bcryptjs (same as secure version for consistency)
    // This ensures only the real user can change their password
    const oldPasswordMatch = await comparePasswordsVulnerable(
      oldPassword,
      userResult.password_hash,
    );

    if (!oldPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    // Validate new password against policy
    const validation = validatePasswordPolicy(newPassword, config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "New password does not meet requirements",
        errors: validation.errors,
      });
    }

    // VULNERABLE: Check password history with SQL injection
    const historyCheck = await checkPasswordHistory(
      userId,
      newPassword,
      db,
      config,
    );

    if (!historyCheck.valid) {
      return res.status(400).json({
        success: false,
        message: historyCheck.reason || "Password validation failed",
      });
    }

    // VULNERABLE: Hash password using bcryptjs (same as secure)
    const newHash = await hashPasswordVulnerable(newPassword);

    // VULNERABLE: SQL injection via string concatenation in UPDATE query
    // Attack: If newHash contained quotes, it could break SQL syntax
    // Example: newHash = "test'; DROP TABLE Users; --"
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${userId}`;

    await db.run(updateQuery);

    // VULNERABLE: Add password to history with SQL injection
    await addPasswordToHistory(userId, newHash, db);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Change password error:", error);

    // Generic error message (same as secure version)
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
}
