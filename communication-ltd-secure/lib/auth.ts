// SECURE VERSION - Password hashing with bcryptjs, parameterized queries
// This file demonstrates SECURE authentication practices

import bcryptjs from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12; // bcryptjs salt rounds for hashing

/**
 * SECURE: Generate a random salt for additional security
 * Note: bcryptjs includes salt in the hash, but this can be used elsewhere
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * SECURE: Hash password using bcryptjs
 * WHY THIS IS SECURE:
 * - Uses bcryptjs algorithm (adaptive and slowing)
 * - Resists brute force attacks through salt + rounds
 * - Even with modern GPU, takes significant time to break
 * - OWASP and NIST recommended
 *
 * IMPLEMENTATION:
 * - Salt rounds = 12 (configurable for performance/security balance)
 * - Each round doubles the time to hash
 * - Recommended: 10-12 rounds (updates as computers get faster)
 */
export async function hashPasswordSecure(password: string): Promise<string> {
  // bcryptjs automatically generates and includes salt in the hash
  // Format: $2a$12$...
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * SECURE: Compare passwords safely
 * WHY THIS IS SECURE:
 * - Uses timing-safe comparison (bcryptjs.compare)
 * - Prevents timing attacks where attacker measures response time
 * - Always takes roughly same time regardless of match position
 */
export async function comparePasswordsSecure(
  provided: string,
  stored: string,
): Promise<boolean> {
  // SECURE: bcryptjs.compare is timing-safe
  return bcryptjs.compare(provided, stored);
}

/**
 * Validate password against policy configuration
 * This part is consistent between vulnerable and secure versions
 */
export function validatePasswordPolicy(
  password: string,
  config: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigits: boolean;
    requireSpecialChars: boolean;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < config.minLength) {
    errors.push(
      `Password must be at least ${config.minLength} characters long`,
    );
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (config.requireDigits && !/\d/.test(password)) {
    errors.push("Password must contain at least one digit");
  }

  if (
    config.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * SECURE: Check password history - verify new password isn't in last N passwords
 * SECURITY: Prevents password reuse attacks
 * Uses PasswordHistory table with individual rows per password for better queryability
 */
export async function checkPasswordHistory(
  userId: number,
  password: string,
  db: any,
  config: any,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // SECURE: Parameterized query to get last N password hashes
    const query = `
      SELECT password_hash FROM PasswordHistory 
      WHERE user_id = ? 
      ORDER BY created_date DESC 
      LIMIT ?
    `;
    const results = await db.all(query, [userId, config.passwordHistory]);

    // Check if new password matches any of the last N passwords
    for (const row of results) {
      const isMatch = await comparePasswordsSecure(password, row.password_hash);
      if (isMatch) {
        return {
          valid: false,
          reason: `Cannot reuse a password from the last ${config.passwordHistory} times.`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("Error checking password history:", error);
    return { valid: true };
  }
}

/**
 * SECURE: Add password to history
 * SECURITY: Track password changes for reuse prevention
 * Stores individual hash with timestamp in PasswordHistory table
 */
export async function addPasswordToHistory(
  userId: number,
  passwordHash: string,
  db: any,
): Promise<void> {
  try {
    // SECURE: Parameterized insert query
    const query = `
      INSERT INTO PasswordHistory (user_id, password_hash, created_date)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    await db.run(query, [userId, passwordHash]);
  } catch (error) {
    console.error("Error adding password to history:", error);
  }
}

export default {
  generateSalt,
  hashPasswordSecure,
  comparePasswordsSecure,
  validatePasswordPolicy,
  checkPasswordHistory,
  addPasswordToHistory,
};
