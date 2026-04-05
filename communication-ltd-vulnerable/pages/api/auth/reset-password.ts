import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import { validatePasswordPolicy, hashPasswordVulnerable } from "@/lib/auth";
import crypto from "crypto";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * VULNERABLE Reset Password API Endpoint
 * POST /api/auth/reset-password
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

  const config = {
    minLength: parseInt(process.env.CONFIG_PASSWORD_MIN_LENGTH || "10"),
    requireUppercase: process.env.CONFIG_PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.CONFIG_PASSWORD_REQUIRE_LOWERCASE === "true",
    requireDigits: process.env.CONFIG_PASSWORD_REQUIRE_DIGITS === "true",
    requireSpecialChars:
      process.env.CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
  };

  const validation = validatePasswordPolicy(newPassword, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet requirements",
      errors: validation.errors,
    });
  }

  try {
    // Hash token to find it
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    const db = await getConnection();

    // VULNERABLE: Direct string concatenation
    const tokenQuery = `SELECT user_id, expiry_date, used FROM PasswordResetTokens WHERE token_hash = '${tokenHash}'`;
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

    const newHash = hashPasswordVulnerable(newPassword, "");

    // VULNERABLE: Direct string concatenation
    const updateQuery = `UPDATE Users SET password_hash = '${newHash}' WHERE id = ${tokenData.user_id}`;
    await db.run(updateQuery);

    // Mark token as used - VULNERABLE
    const markUsedQuery = `UPDATE PasswordResetTokens SET used = 1 WHERE token_hash = '${tokenHash}'`;
    await db.run(markUsedQuery);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully (VULNERABLE VERSION)",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password: " + error.message,
    });
  }
}
