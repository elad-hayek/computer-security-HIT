import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
  checkPasswordHistory,
  addPasswordToHistory,
} from "@/lib/auth";
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

    // VULNERABLE: No verification of old password!
    // VULNERABLE: String concatenation - userId could be injected
    // ATTACK: userId = "1; DROP TABLE Users; --"
    const userQuery = `SELECT id FROM Users WHERE id = ${userId}`;
    console.log("[VULNERABLE DEBUG] User query:", userQuery);

    const userResult = await db.all(userQuery);

    if (userResult.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // NOTE: This checks password history but uses vulnerable SQL injection in checkPasswordHistory
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

    // VULNERABLE: Plain text password storage
    const newHash = hashPasswordVulnerable(newPassword, "");

    // VULNERABLE: Direct string concatenation with potential SQL injection
    // ATTACK EXAMPLE:
    // newHash = "test'; DROP TABLE Users; --"
    // This would execute: UPDATE Users SET password_hash = 'test'; DROP TABLE Users; --', ...
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${userId}`;
    console.log("[VULNERABLE DEBUG] Update query:", updateQuery);

    await db.run(updateQuery);

    // VULNERABLE: Add password to history with SQL injection
    await addPasswordToHistory(userId, newHash, db);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password: " + error.message,
    });
  }
}
