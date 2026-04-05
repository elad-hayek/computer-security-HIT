import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import {
  validatePasswordPolicy,
  hashPasswordSecure,
  comparePasswordsSecure,
} from "@/lib/auth";

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
 * 2. Password history check (prevents reuse of last 3 passwords)
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

  // Get password policy
  const config = {
    minLength: parseInt(process.env.CONFIG_PASSWORD_MIN_LENGTH || "10"),
    requireUppercase: process.env.CONFIG_PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.CONFIG_PASSWORD_REQUIRE_LOWERCASE === "true",
    requireDigits: process.env.CONFIG_PASSWORD_REQUIRE_DIGITS === "true",
    requireSpecialChars:
      process.env.CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
    historyCount: parseInt(process.env.CONFIG_PASSWORD_HISTORY_COUNT || "3"),
  };

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
    const userQuery = `SELECT id, password_hash, password_history FROM Users WHERE id = ?`;
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

    // SECURE: Check password history
    // WHY: Prevents reusing same password multiple times
    const historyCount = config.historyCount || 3;
    let passwordHistory: string[] = [];

    if (user.password_history) {
      try {
        passwordHistory = JSON.parse(user.password_history);
      } catch {
        passwordHistory = [];
      }
    }

    // Check if new password matches any in history
    for (const oldHash of passwordHistory.slice(0, historyCount)) {
      const historyMatch = await comparePasswordsSecure(newPassword, oldHash);
      if (historyMatch) {
        return res.status(400).json({
          success: false,
          message: `Cannot reuse any of your last ${historyCount} passwords`,
        });
      }
    }

    // SECURE: Hash new password
    const newHash = await hashPasswordSecure(newPassword);

    // Update password history
    const newHistory = [user.password_hash, ...passwordHistory].slice(
      0,
      historyCount,
    );

    // SECURE: Parameterized update query
    const updateQuery = `UPDATE Users 
                         SET password_hash = ?, 
                             password_history = ?,
                             password_changed_date = CURRENT_TIMESTAMP 
                         WHERE id = ?`;

    await db.run(updateQuery, [newHash, JSON.stringify(newHistory), userId]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully (SECURE VERSION)",
    });
  } catch (error: any) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
}

                         SET password_hash = @password_hash, 
                             password_history = @password_history,
                             password_changed_date = GETDATE() 
                         WHERE id = @user_id`;

    await updateRequest.query(updateQuery);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully (SECURE VERSION)",
    });
  } catch (error: any) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
}
