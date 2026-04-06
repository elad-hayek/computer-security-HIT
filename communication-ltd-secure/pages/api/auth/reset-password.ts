import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  checkPasswordHistory,
  addPasswordToHistory,
} from "@/lib/auth";
import { getPasswordConfig } from "@/lib/passwordConfig";
import crypto from "crypto";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * SECURE Reset Password API Endpoint
 * POST /api/auth/reset-password
 *
 * SECURITY FEATURES:
 * 1. Token validation with SHA-1 hash comparison
 * 2. Expiry checking (1 hour)
 * 3. Token marked as used (prevent reuse)
 * 4. Password history check (no reuse of last N passwords)
 * 5. Parameterized queries prevent SQL injection
 * 6. Bcryptjs password hashing
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

  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }

  const config = getPasswordConfig();

  const validation = validatePasswordPolicy(newPassword, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet requirements",
      errors: validation.errors,
    });
  }

  try {
    // SECURE: Hash token to find it (don't store plain tokens)
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    const db = await getConnection();

    // SECURE: Parameterized query to find token
    const tokenQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens 
                        WHERE token_hash = ?`;
    const tokenData = await db.get(tokenQuery, [tokenHash]);

    if (!tokenData || tokenData.used) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    if (new Date(tokenData.expiry_date) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Token has expired" });
    }

    // SECURE: Check password history - prevent reuse
    const historyCheck = await checkPasswordHistory(
      tokenData.user_id,
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

    // SECURE: Hash new password with bcryptjs
    const newHash = await hashPasswordSecure(newPassword);

    // SECURE: Parameterized update query
    const updateQuery = `
      UPDATE Users 
      SET password_hash = ?, password_changed_date = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await db.run(updateQuery, [newHash, tokenData.user_id]);

    // SECURE: Add new password to history
    await addPasswordToHistory(tokenData.user_id, newHash, db);

    // SECURE: Mark token as used to prevent reuse
    const markUsedQuery = `UPDATE PasswordResetTokens SET used = 1 WHERE token_hash = ?`;
    await db.run(markUsedQuery, [tokenHash]);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
}
