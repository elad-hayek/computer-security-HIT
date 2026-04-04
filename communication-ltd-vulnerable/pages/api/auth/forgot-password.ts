import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import crypto from "crypto";
import sql from "mssql";

type ResponseData = {
  success: boolean;
  message: string;
  token?: string;
};

/**
 * VULNERABLE Forgot Password API Endpoint
 * POST /api/auth/forgot-password
 *
 * Request password reset token
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
    const pool = await getConnection();

    // VULNERABLE: Direct query without parameterization
    const query = `SELECT id, email FROM Users WHERE email = '${email}'`;
    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      // VULNERABLE: Reveals whether email exists
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    const user = result.recordset[0];

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");

    // Set expiry to 1 hour from now
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    // VULNERABLE: Direct string concatenation
    const insertQuery = `INSERT INTO PasswordResetTokens (user_id, token_hash, expiry_date, used) VALUES (${user.id}, '${tokenHash}', '${expiry.toISOString()}', 0)`;

    await pool.request().query(insertQuery);

    // In real application, would send email
    // For demo, log token to console
    console.log(`[VULNERABLE] Reset token for ${email}: ${token}`);

    // VULNERABLE: Should not return token in response
    // Further: Should not log it to console where it can be seen
    return res.status(200).json({
      success: true,
      message: `Password reset token sent to ${email} (check console)`,
      token: token, // VULNERABLE: Exposing token in response!
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process request: " + error.message,
    });
  }
}
