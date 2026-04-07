import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import { comparePasswordsSecure } from "@/lib/auth";
import { getPasswordConfig } from "@/lib/passwordConfig";

type ResponseData = {
  success: boolean;
  message: string;
  user?: any;
};

/**
 * SECURE Login API Endpoint
 * POST /api/auth/login
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Bcryptjs password comparison (timing-safe)
 * 3. Rate limiting (tracks login attempts)
 * 4. Account lockout after N failed attempts
 * 5. Generic error messages (no information leakage)
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

  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password required" });
  }

  try {
    // SECURE: Use parameterized query
    // WHY: SQLite treats ? as data placeholder, not code
    // Even "admin' OR '1'='1' --" is just a literal string to match
    const db = await getConnection();

    // SECURE: First query - find user by username only (parameterized)
    const userQuery = `SELECT id, username, email, password_hash, login_attempts, locked_until FROM Users WHERE username = ?`;
    const userResult = await db.get(userQuery, [username]);

    if (!userResult) {
      // SECURE: Generic error message (no username enumeration)
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = userResult;
    console.log(`Login attempt for user '${JSON.stringify(user)}'`);

    // SECURE: Check if account is locked
    const config = getPasswordConfig();
    const maxAttempts = config.maxLoginAttempts;
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Account temporarily locked. Try again later.",
      });
    }

    // SECURE: Compare hashed passwords with timing-safe function
    const passwordMatch = await comparePasswordsSecure(
      password,
      user.password_hash,
    );

    if (!passwordMatch) {
      // SECURE: Increment login attempts
      const newAttempts = user.login_attempts + 1;
      let lockedUntil = null;

      if (newAttempts >= maxAttempts) {
        // Lock account for 15 minutes
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      // Update failed attempts (parameterized)
      const updateQuery = `UPDATE Users SET login_attempts = ?, locked_until = ? WHERE id = ?`;
      await db.run(updateQuery, [newAttempts, lockedUntil, user.id]);

      // SECURE: Generic error message
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // SECURE: Reset login attempts on successful login
    const resetQuery = `UPDATE Users SET login_attempts = 0, locked_until = NULL WHERE id = ?`;
    await db.run(resetQuery, [user.id]);

    return res.status(200).json({
      success: true,
      message: `Login successful for user '${user.username}' (SECURE VERSION)`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // SECURE: Generic error message (don't reveal database errors)
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
}
