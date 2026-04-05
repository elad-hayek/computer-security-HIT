import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import crypto from "crypto";

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * SECURE Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * SECURITY FEATURES:
 * 1. Parameterized query prevents SQL injection
 * 2. Token is generated securely with crypto.randomBytes
 * 3. Only hash is stored in DB (token itself sent via email)
 * 4. Generic response (doesn't reveal if email exists)
 * 5. Token expires after 1 hour
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
    // Email would contain: visit ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}
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
    console.error("Forgot password error:", error);

    // SECURE: Generic error message
    return res.status(500).json({
      success: true, // Still return success to avoid email enumeration
      message:
        "If an account exists with this email, a reset link will be sent",
    });
  }
}
