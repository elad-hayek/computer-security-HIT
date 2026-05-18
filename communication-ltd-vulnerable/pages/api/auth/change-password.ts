import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, getAsync, runAsync } from "@/lib/db";
import {
  validatePasswordPolicy,
  checkPasswordDictionary,
  hashPasswordHMAC,
  generateSalt,
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
 * 1. SQL injection via string concatenation in user query (WHERE id = ${userId})
 * 2. SQL injection in old password verification query
 * 3. SQL injection in UPDATE query for new password and salt
 * 4. VULNERABLE PASSWORD HISTORY: Uses SQL injection in checkPasswordHistory function
 * 5. Password history UPDATE also uses string concatenation
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

  // Extract userId from authentication cookie (not from request body)
  // In this vulnerable version, we still verify old password like secure version
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

  if (oldPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from old password",
    });
  }

  try {
    try {
      const db = await getConnection();

      // Get password policy from config first
      const config = getPasswordConfig();

      // SQL injection via string concatenation
      const userQuery = `SELECT id, password_hash, salt FROM Users WHERE id = ${userId}`;

      const userResult = await getAsync(db, userQuery);

      if (!userResult) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Hash old password with stored salt
      // Same hashing as secure (no vulnerability in hashing itself)
      const oldPasswordHash = await hashPasswordHMAC(
        oldPassword,
        userResult.salt,
      );

      const verifyQuery = `SELECT id FROM Users WHERE id = ${userId} AND password_hash = '${oldPasswordHash}'`;

      const verifyResult = await getAsync(db, verifyQuery);

      if (!verifyResult) {
        return res
          .status(401)
          .json({ success: false, message: "Old password is incorrect" });
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

      // Check password dictionary
      const dictionaryCheck = checkPasswordDictionary(newPassword);
      if (dictionaryCheck.isWeak) {
        return res.status(400).json({
          success: false,
          message: dictionaryCheck.suggestion || "Password validation failed",
        });
      }

      // Check password history with SQL injection
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

      // Generate new salt (same as secure)
      // No vulnerability in salt generation itself
      const newSalt = generateSalt();

      // Hash password using HMAC (same as secure)
      const newHash = await hashPasswordHMAC(newPassword, newSalt);

      const updateQuery = `UPDATE Users SET password_hash = '${newHash}', salt = '${newSalt}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${userId}`;

      await runAsync(db, updateQuery);

      // Add password to history with SQL injection
      await addPasswordToHistory(userId, newHash, newSalt, db);

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
  } finally {
    await closeConnection();
  }
}
