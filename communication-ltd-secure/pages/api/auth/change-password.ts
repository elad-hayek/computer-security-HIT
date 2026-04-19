import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, getAsync, runAsync } from "@/lib/db";
import {
  validatePasswordPolicy,
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
 * SECURE Change Password API Endpoint
 * POST /api/auth/change-password
 *
 * SECURITY FEATURES:
 * 1. Verification of old password (prevents unauthorized changes)
 * 2. Password history check using PasswordHistory table (prevents reuse of last N passwords)
 * 3. Parameterized queries prevent SQL injection
 * 4. HMAC-SHA256 password hashing with per-user salt
 * 5. New salt generated for each password change
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

  // SECURE: Extract userId from authentication cookie (not from request body)
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
    try {
      const db = await getConnection();

      // SECURE: Parameterized query to fetch user with salt
      const userQuery = `SELECT id, password_hash, salt FROM Users WHERE id = ?`;
      const user = await getAsync(db, userQuery, [userId]);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // SECURE: Hash old password with stored salt
      const oldPasswordHash = await hashPasswordHMAC(oldPassword, user.salt);

      // SECURE: Verify old password - parameterized query
      // WHY: Ensures only the real user can change their own password
      const verifyQuery = `SELECT id FROM Users WHERE id = ? AND password_hash = ?`;
      const verifyResult = await getAsync(db, verifyQuery, [
        userId,
        oldPasswordHash,
      ]);

      if (!verifyResult) {
        return res
          .status(401)
          .json({ success: false, message: "Old password is incorrect" });
      }

      // SECURE: Check password history using PasswordHistory table
      // WHY: Prevents reusing same password multiple times
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

      // SECURE: Generate new salt for this password change
      const newSalt = generateSalt();

      // SECURE: Hash new password with new salt
      const newHash = await hashPasswordHMAC(newPassword, newSalt);

      // SECURE: Parameterized update query with new salt and hash
      const updateQuery = `
        UPDATE Users 
        SET password_hash = ?, 
            salt = ?,
            password_changed_date = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await runAsync(db, updateQuery, [newHash, newSalt, userId]);

      // SECURE: Add new password to history (with new salt)
      await addPasswordToHistory(userId, newHash, newSalt, db);

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      console.error("Change password error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  } finally {
    await closeConnection();
  }
}
