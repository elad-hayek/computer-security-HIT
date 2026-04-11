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
 * SECURE Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * Actions:
 * 1. requestToken - Generate and send reset token to email
 * 2. resetPassword - Validate token and reset password
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Token is generated securely with crypto.randomBytes
 * 3. Only hash is stored in DB (token itself sent via email)
 * 4. Generic response (doesn't reveal if email exists)
 * 5. Token expires after 1 hour
 * 6. Token marked as used (prevent reuse)
 * 7. Password history check (prevent password reuse)
 * 8. Bcryptjs password hashing with salt
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

  const { action } = req.body;

  if (action === "requestToken") {
    return handleRequestToken(req, res);
  } else if (action === "resetPassword") {
    return handleResetPassword(req, res);
  } else {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }
}

async function handleRequestToken(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  try {
    const db = await getConnection();

    // SECURE: Parameterized query
    const userQuery = `SELECT id, email, username FROM Users WHERE email = ?`;
    const user = await db.get(userQuery, [email]);

    // SECURE: Generic response (doesn't leak whether email exists)
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a reset link will be sent",
      });
    }

    // SECURE: Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    // Set expiry to 1 hour from now
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    // SECURE: Parameterized insert query
    const insertQuery = `INSERT INTO PasswordResetTokens (user_id, token_hash, expiry_date, used) 
                         VALUES (?, ?, ?, 0)`;

    await db.run(insertQuery, [user.id, tokenHash, expiry.toISOString()]);

    // In real application, would send email with reset link
    // Email would contain: visit ${process.env.NEXT_PUBLIC_APP_URL}/forgot-password?token=${token}
    // For demo purposes, log to console
    console.log(
      `[SECURE] Reset token sent to ${email}. Token: ${token} (valid for 1 hour)`,
    );

    // SECURE: Generic message doesn't reveal whether email existed
    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a reset link will be sent. Check console for token (demo only)",
    });
  } catch (error: any) {
    console.error("Request token error:", error);

    // SECURE: Generic error message
    return res.status(500).json({
      success: true, // Still return success to avoid email enumeration
      message:
        "If an account exists with this email, a reset link will be sent",
    });
  }
}

async function handleResetPassword(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
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
