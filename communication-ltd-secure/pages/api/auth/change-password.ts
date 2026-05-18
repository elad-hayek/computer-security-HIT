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
import { validatePasswordLength } from "@/lib/validation";

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

  // Extract userId from authentication cookie (not from request body)
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // Validate password fields
  const oldPasswordValidation = validatePasswordLength(oldPassword);
  if (!oldPasswordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: oldPasswordValidation.error || "Invalid old password",
    });
  }

  const newPasswordValidation = validatePasswordLength(newPassword);
  if (!newPasswordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: newPasswordValidation.error || "Invalid new password",
    });
  }

  if (!confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Confirmation password is required",
    });
  }

  const validatedOldPassword = oldPasswordValidation.value;
  const validatedNewPassword = newPasswordValidation.value;

  if (validatedNewPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "New passwords do not match" });
  }

  if (validatedOldPassword === validatedNewPassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from old password",
    });
  }

  // Get password policy from config
  const config = getPasswordConfig();

  // Validate new password against policy
  const validation = validatePasswordPolicy(validatedNewPassword, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "New password does not meet requirements",
      errors: validation.errors,
    });
  }

  // Check weak password dictionary
  const dictionaryCheck = checkPasswordDictionary(validatedNewPassword);
  if (dictionaryCheck.isWeak) {
    return res.status(400).json({
      success: false,
      message: dictionaryCheck.suggestion || "Password validation failed",
    });
  }

  try {
    try {
      const db = await getConnection();

      // Parameterized query to fetch user with salt
      const userQuery = `SELECT id, password_hash, salt FROM Users WHERE id = ?`;
      const user = await getAsync(db, userQuery, [userId]);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Hash old password with stored salt
      const oldPasswordHash = await hashPasswordHMAC(
        validatedOldPassword,
        user.salt,
      );

      // Verify old password - parameterized query
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

      // Check password history using PasswordHistory table
      const historyCheck = await checkPasswordHistory(
        userId,
        validatedNewPassword,
        db,
        config,
      );

      if (!historyCheck.valid) {
        return res.status(400).json({
          success: false,
          message: historyCheck.reason || "Password validation failed",
        });
      }

      // Generate new salt for this password change
      const newSalt = generateSalt();

      // Hash new password with new salt
      const newHash = await hashPasswordHMAC(validatedNewPassword, newSalt);

      // Parameterized update query with new salt and hash
      const updateQuery = `
        UPDATE Users 
        SET password_hash = ?, 
            salt = ?,
            password_changed_date = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await runAsync(db, updateQuery, [newHash, newSalt, userId]);

      // Add new password to history (with new salt)
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
