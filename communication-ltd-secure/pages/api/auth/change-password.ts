import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  comparePasswordsSecure,
  checkPasswordHistory,
  addPasswordToHistory,
} from "@/lib/auth";
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
 * 4. Bcryptjs password hashing
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

  const { userId, oldPassword, newPassword, confirmPassword } = req.body;

  if (!userId || !oldPassword || !newPassword || !confirmPassword) {
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
    const db = await getConnection();

    // SECURE: Parameterized query to fetch user
    const userQuery = `SELECT id, password_hash FROM Users WHERE id = ?`;
    const user = await db.get(userQuery, [userId]);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // SECURE: Verify old password before allowing change
    // WHY: Ensures only the real user can change their own password
    const oldPasswordMatch = await comparePasswordsSecure(
      oldPassword,
      user.password_hash,
    );

    if (!oldPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // SECURE: Check password history using new PasswordHistory table
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

    // SECURE: Hash new password
    const newHash = await hashPasswordSecure(newPassword);

    // SECURE: Parameterized update query
    const updateQuery = `
      UPDATE Users 
      SET password_hash = ?, 
          password_changed_date = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await db.run(updateQuery, [newHash, userId]);

    // SECURE: Add new password to history
    await addPasswordToHistory(userId, newHash, db);

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
}
