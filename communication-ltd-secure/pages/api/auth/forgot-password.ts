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
import { getPasswordConfig } from "@/lib/passwordConfig";
import { sendPasswordResetEmail } from "@/lib/mail";
import { validateEmail } from "@/lib/validation";
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
 * 1. requestToken - Generate and send reset code to email
 * 2. verifyCode - Validate the code entered by user
 * 3. resetPassword - Validate code and reset password
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Code is generated securely
 * 3. Only hash is stored in DB (code itself sent via email)
 * 4. Generic response (doesn't reveal if email exists)
 * 5. Code expires after 15 minutes
 * 6. Code marked as used (prevent reuse)
 * 7. Password history check (prevent password reuse)
 * 8. password hashing with salt
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
  } else if (action === "verifyCode") {
    return handleVerifyCode(req, res);
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

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: emailValidation.error || "Invalid email",
    });
  }

  const validatedEmail = emailValidation.value;

  try {
    try {
      const db = await getConnection();

      // Parameterized query
      const userQuery = `SELECT id, email, username FROM Users WHERE email = ?`;
      const user = await getAsync(db, userQuery, [validatedEmail]);

      // Generic response (doesn't leak whether email exists)
      if (!user) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with this email, a reset link will be sent",
        });
      }

      // Generate cryptographically secure token
      const token = crypto.randomBytes(10).toString("hex");
      const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

      console.log(token)

      // Set expiry to 15 minutes from now
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      // Parameterized insert query
      const insertQuery = `INSERT INTO PasswordResetTokens (user_id, token_hash, expiry_date, used) 
                           VALUES (?, ?, ?, 0)`;

      await runAsync(db, insertQuery, [
        user.id,
        tokenHash,
        expiry.toISOString(),
      ]);

      // Send password reset email with token
      await sendPasswordResetEmail(validatedEmail, token);

      // Generic message doesn't reveal whether email existed
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a reset link will be sent",
      });
    } catch (error: any) {
      console.error("Request token error:", error);

      // Generic error message
      return res.status(500).json({
        success: true, // Still return success to avoid email enumeration
        message:
          "If an account exists with this email, a reset link will be sent",
      });
    }
  } finally {
    await closeConnection();
  }
}

async function handleVerifyCode(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const { code, email } = req.body;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: emailValidation.error || "Invalid email",
    });
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      message: "Code is required and must be a string",
    });
  }

  const validatedEmail = emailValidation.value;
  const validatedCode = code.trim();

  try {
    try {
      // Hash code to find it
      const codeHash = crypto
        .createHash("sha1")
        .update(validatedCode)
        .digest("hex");

      const db = await getConnection();

      // Get user by email
      const userQuery = `SELECT id FROM Users WHERE email = ?`;
      const user = await getAsync(db, userQuery, [validatedEmail]);

      if (!user) {
        // Generic response (doesn't leak whether email exists)
        return res.status(200).json({
          success: false,
          message: "Invalid code or email combination",
        });
      }

      // Parameterized query to find code
      const codeQuery = `SELECT id, expiry_date, used FROM PasswordResetTokens 
                         WHERE token_hash = ? AND user_id = ?`;
      const codeData = await getAsync(db, codeQuery, [codeHash, user.id]);

      if (!codeData || codeData.used) {
        return res.status(200).json({
          success: false,
          message: "Invalid or expired code",
        });
      }

      if (new Date(codeData.expiry_date) < new Date()) {
        return res.status(200).json({
          success: false,
          message: "Code has expired",
        });
      }

      // Code is valid
      return res.status(200).json({
        success: true,
        message: "Code verified successfully",
      });
    } catch (error: any) {
      console.error("Verify code error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify code",
      });
    }
  } finally {
    await closeConnection();
  }
}

async function handleResetPassword(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const { code, newPassword, confirmPassword } = req.body;

  if (!code || !newPassword || !confirmPassword) {
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

  // Check weak password dictionary
  const dictionaryCheck = checkPasswordDictionary(newPassword);
  if (dictionaryCheck.isWeak) {
    return res.status(400).json({
      success: false,
      message: dictionaryCheck.suggestion || "Password validation failed",
      errors: ["WEAK_PASSWORD"],
    });
  }

  try {
    try {
      // Hash code to find it (don't store plain codes)
      const codeHash = crypto.createHash("sha1").update(code).digest("hex");

      const db = await getConnection();

      // Parameterized query to find code
      const codeQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens 
                          WHERE token_hash = ?`;
      const codeData = await getAsync(db, codeQuery, [codeHash]);

      if (!codeData || codeData.used) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired code" });
      }

      if (new Date(codeData.expiry_date) < new Date()) {
        return res
          .status(400)
          .json({ success: false, message: "Code has expired" });
      }

      // Check password history - prevent reuse
      const historyCheck = await checkPasswordHistory(
        codeData.user_id,
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

      // Generate new salt for this password reset
      const newSalt = generateSalt();

      // Hash new password with HMAC-SHA256
      const newHash = await hashPasswordHMAC(newPassword, newSalt);

      // Parameterized update query with new salt
      const updateQuery = `
        UPDATE Users 
        SET password_hash = ?, salt = ?, password_changed_date = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await runAsync(db, updateQuery, [newHash, newSalt, codeData.user_id]);

      // Add new password to history with salt
      await addPasswordToHistory(codeData.user_id, newHash, newSalt, db);

      // Mark code as used to prevent reuse
      const markUsedQuery = `UPDATE PasswordResetTokens SET used = 1 WHERE token_hash = ?`;
      await runAsync(db, markUsedQuery, [codeHash]);

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
  } finally {
    await closeConnection();
  }
}
