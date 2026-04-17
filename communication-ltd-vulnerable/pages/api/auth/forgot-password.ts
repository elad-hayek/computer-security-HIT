import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, getAsync, runAsync, allAsync } from "@/lib/db";
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
 * VULNERABLE Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * Actions:
 * 1. requestToken - Request password reset code via email
 * 2. verifyCode - Verify the code sent to user's email
 * 3. resetPassword - Reset password with verified code
 *
 * VULNERABILITIES PRESERVED:
 * - SQL Injection via string concatenation
 * - Account enumeration (different responses for existing vs non-existing emails)
 * - Tokens not marked as used (replay attacks possible)
 * - No expiry enforcement
 * - Weak password hashing
 * - No password history check
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

  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  try {
    const db = await getConnection();

    // VULNERABILITY: SQL Injection via string concatenation
    const query = `SELECT id, email FROM Users WHERE email = '${email}'`;

    const result = await allAsync(db, query);

    if (result.length === 0) {
      // VULNERABILITY: Account enumeration - different response for non-existent email
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    const user = result[0];

    // Generate code
    const code = crypto.randomBytes(16).toString("hex");
    const codeHash = crypto.createHash("sha1").update(code).digest("hex");

    // Set expiry to 1 hour from now
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    // VULNERABILITY: SQL Injection via string concatenation
    const insertQuery = `INSERT INTO PasswordResetTokens (user_id, token_hash, expiry_date, used) VALUES (${user.id}, '${codeHash}', '${expiry.toISOString()}', 0)`;

    await runAsync(db, insertQuery);

    // In real application, would send email
    // For demo, log code to console
    console.log(`[VULNERABLE DEMO] Reset code for ${email}: ${code}`);

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a reset link will be sent",
    });
  } catch (error: any) {
    console.error("Request token error:", error);

    return res.status(500).json({
      success: false,
      message:
        "If an account exists with this email, a reset link will be sent",
    });
  }
}

async function handleVerifyCode(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  const { code, email } = req.body;

  if (!code || !email) {
    return res
      .status(400)
      .json({ success: false, message: "Code and email required" });
  }

  try {
    // VULNERABILITY: Code hash without proper validation
    const codeHash = crypto.createHash("sha1").update(code).digest("hex");

    const db = await getConnection();

    // VULNERABILITY: SQL Injection - email parameter
    const userQuery = `SELECT id FROM Users WHERE email = '${email}'`;
    const user = await getAsync(db, userQuery);

    if (!user) {
      return res.status(200).json({
        success: false,
        message: "Invalid code or email combination",
      });
    }

    // VULNERABILITY: SQL Injection - codeHash parameter
    const codeQuery = `SELECT id, expiry_date, used FROM PasswordResetTokens WHERE token_hash = '${codeHash}' AND user_id = ${user.id}`;
    const codeData = await getAsync(db, codeQuery);

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

  try {
    // VULNERABILITY: Code hash without proper validation
    const codeHash = crypto.createHash("sha1").update(code).digest("hex");

    const db = await getConnection();

    // VULNERABILITY: SQL Injection in code query
    const codeQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens WHERE token_hash = '${codeHash}'`;
    const codeData = await getAsync(db, codeQuery);

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

    // VULNERABILITY: No password history check
    // Users can reuse old passwords

    // VULNERABILITY: Weak password hashing (plain text or weak hash)
    const newHash = await hashPasswordSecure(newPassword);

    // VULNERABILITY: SQL Injection in update query
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${codeData.user_id}`;

    await runAsync(db, updateQuery);

    // VULNERABILITY: Token NOT marked as used
    // Can be reused multiple times (replay attack)

    return res.status(200).json({
      success: true,
      message: "Password reset successfully! Redirecting to login...",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
}
import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import crypto from "crypto";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * VULNERABLE Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * Actions:
 * 1. requestToken - Request password reset token (VULNERABLE TO SQL INJECTION)
 * 2. resetPassword - Reset password with token (VULNERABLE TO SQL INJECTION & WEAK HASHING)
 *
 * VULNERABILITIES DEMONSTRATED:
 * 1. SQL Injection via string concatenation
 * 2. Account enumeration (different responses for existing vs non-existing emails)
 * 3. No token validation before accepting
 * 4. Tokens not marked as used
 * 5. No password history check
 * 6. Weak password hashing
 * 7. No expiry enforcement
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

    // VULNERABILITY: SQL Injection via string concatenation
    // An attacker could input: ' OR '1'='1
    // Or: '; DROP TABLE Users; --
    const query = `SELECT id, email FROM Users WHERE email = '${email}'`;
    console.log("[DEBUG] Query:", query); // VULNERABILITY: Debug log exposes SQL

    const result = await allAsync(db, query);

    if (result.length === 0) {
      // VULNERABILITY: Account enumeration - reveals email doesn't exist
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    const user = result[0];

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    // Set expiry to 1 hour from now (but not enforced in reset!)
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    // VULNERABILITY: SQL Injection via string concatenation
    const insertQuery = `INSERT INTO PasswordResetTokens (user_id, token_hash, expiry_date, used) VALUES (${user.id}, '${tokenHash}', '${expiry.toISOString()}', 0)`;
    console.log("[DEBUG] Insert Query:", insertQuery); // VULNERABILITY: Debug log

    await runAsync(db, insertQuery);

    // In real application, would send email
    // For demo, log token to console
    console.log(`[VULNERABLE] Reset token for ${email}: ${token}`);

    // VULNERABILITY: Exposing token in response
    return res.status(200).json({
      success: true,
      message: `Password reset token sent to ${email} (check console)`,
    });
  } catch (error: any) {
    console.error("Request token error:", error);

    // VULNERABILITY: Error message exposes details
    return res.status(500).json({
      success: false,
      message: "Failed to process request: " + error.message,
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

  try {
    const db = await getConnection();

    // VULNERABILITY: Token not properly validated
    // Any string accepted as token initially
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    // VULNERABILITY: SQL Injection via string concatenation
    const tokenQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens WHERE token_hash = '${tokenHash}'`;
    console.log("[DEBUG] Token Query:", tokenQuery);

    const tokenResult = await allAsync(db, tokenQuery);

    if (tokenResult.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const tokenData = tokenResult[0];

    // VULNERABILITY: No expiry check enforced
    // Even if token is expired, it's still accepted
    if (new Date(tokenData.expiry_date) < new Date()) {
      // This check isn't always enforced in vulnerable version
      console.log("[DEBUG] TOKEN EXPIRED but continuing anyway");
    }

    // VULNERABILITY: No password history check
    // Users can reuse old passwords

    // VULNERABILITY: Weak password hashing (plain text or weak hash)
    // Using simple hash instead of bcryptjs with salt
    const weakHash = crypto
      .createHash("sha256")
      .update(newPassword)
      .digest("hex");

    // VULNERABILITY: SQL Injection in update query
    const updateQuery = `UPDATE Users SET password_hash = '${weakHash}', password_changed_date = CURRENT_TIMESTAMP WHERE id = ${tokenData.user_id}`;
    console.log("[DEBUG] Update Query:", updateQuery);

    await runAsync(db, updateQuery);

    // VULNERABILITY: Token NOT marked as used
    // Can be reused multiple times (replay attack)
    // Missing: UPDATE PasswordResetTokens SET used = 1 WHERE token_hash = '${tokenHash}'

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password: " + error.message,
    });
  }
}
