import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordVulnerable,
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
 * VULNERABLE Reset Password API Endpoint
 * POST /api/auth/reset-password
 *
 * VULNERABILITIES:
 * 1. Plain text password storage (no hashing)
 * 2. SQL injection in token lookup query (string concatenation)
 * 3. SQL injection in password history check (checkPasswordHistory)
 * 4. No password history validation protection - could reuse same password
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
    // Hash token to find it (but we'll use it in a vulnerable query)
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    const db = await getConnection();

    // VULNERABLE: Direct string concatenation with tokenHash
    // Even though tokenHash is derived from SHA-1, the query format is still vulnerable
    // Attack: If token input crafted carefully, attacker could inject SQL
    const tokenQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens WHERE token_hash = '${tokenHash}'`;
    console.log("[VULNERABLE DEBUG] Token query:", tokenQuery);

    const tokenResult = await db.all(tokenQuery);

    if (tokenResult.length === 0 || tokenResult[0].used) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const tokenData = tokenResult[0];

    if (new Date(tokenData.expiry_date) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Token has expired" });
    }

    // NOTE: This checks password history but uses vulnerable SQL injection
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

    // VULNERABLE: Plain text password storage
    const newHash = hashPasswordVulnerable(newPassword, "");

    // VULNERABLE: Direct string concatenation
    // ATTACK: newHash = "test'; DROP TABLE Users; --"
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}' WHERE id = ${tokenData.user_id}`;
    console.log("[VULNERABLE DEBUG] Update query:", updateQuery);

    await db.run(updateQuery);

    // VULNERABLE: Mark token as used with SQL injection
    const markUsedQuery = `UPDATE PasswordResetTokens SET used = 1 WHERE token_hash = '${tokenHash}'`;
    await db.run(markUsedQuery);

    // VULNERABLE: Add password to history with SQL injection
    await addPasswordToHistory(tokenData.user_id, newHash, db);

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
