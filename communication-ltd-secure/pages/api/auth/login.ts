import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, getAsync, runAsync } from "@/lib/db";
import { hashPasswordHMAC } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { getPasswordConfig } from "@/lib/passwordConfig";
import { validateUsername, validatePasswordLength } from "@/lib/validation";

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * SECURE Login API Endpoint
 * POST /api/auth/login
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. HASH password comparison (HMAC-SHA256 with salt)
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

  // Validate inputs
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: usernameValidation.error || "Invalid username",
    });
  }

  const passwordValidation = validatePasswordLength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: passwordValidation.error || "Invalid password",
    });
  }

  const validatedUsername = usernameValidation.value;
  const validatedPassword = passwordValidation.value;

  try {
    try {
      const db = await getConnection();

      // First, fetch user by username to get the salt (parameterized)
      const userQuery = `SELECT id, username, email, salt, password_hash, login_attempts, locked_until FROM Users WHERE username = ?`;
      const user = await getAsync(db, userQuery, [validatedUsername]);

      if (!user) {
        // Generic error message (no username enumeration)
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      console.log(`Login attempt for user '${user.username}'`);

      // Check if account is locked
      const config = getPasswordConfig();
      const maxAttempts = config.maxLoginAttempts;
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(403).json({
          success: false,
          message: "Account temporarily locked. Try again later.",
        });
      }

      // Hash the provided password with the stored salt
      const computedHash = await hashPasswordHMAC(validatedPassword, user.salt);

      // Query to verify password - parameterized query with both username AND hash
      const verifyQuery = `SELECT id FROM Users WHERE username = ? AND password_hash = ?`;
      const verifyResult = await getAsync(db, verifyQuery, [
        validatedUsername,
        computedHash,
      ]);

      if (!verifyResult) {
        // Password doesn't match - increment login attempts
        const newAttempts = user.login_attempts + 1;
        let lockedUntil = null;

        if (newAttempts >= maxAttempts) {
          // Lock account for 15 minutes
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        // Update failed attempts (parameterized)
        const updateQuery = `UPDATE Users SET login_attempts = ?, locked_until = ? WHERE id = ?`;
        await runAsync(db, updateQuery, [newAttempts, lockedUntil, user.id]);

        // Generic error message
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Reset login attempts on successful login
      const resetQuery = `UPDATE Users SET login_attempts = 0, locked_until = NULL WHERE id = ?`;
      await runAsync(db, resetQuery, [user.id]);

      // Set HTTP-only cookie for authentication
      setAuthCookie(res, user.id);

      return res.status(200).json({
        success: true,
        message: `Login successful for user '${user.username}' (SECURE VERSION)`,
      });
    } catch (error: any) {
      console.error("Login error:", error);

      // Generic error message (don't reveal database errors)
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  } finally {
    await closeConnection();
  }
}
