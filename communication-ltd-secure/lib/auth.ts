// SECURE VERSION - Password hashing with bcryptjs, parameterized queries
// This file demonstrates SECURE authentication practices

import bcryptjs from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12; // bcryptjs salty rounds for hashing

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
 * SECURE: Build parameterized login query
 * WHY THIS IS SECURE:
 * - Uses ? placeholders (NOT string concatenation)
 * - SQL Lite separates query structure from data
 * - Any SQL metacharacters in username are treated as literal data
 * - Completely prevents SQL Injection
 *
 * EXAMPLE ATTACK (this won't work):
 * - If username = "admin' OR '1'='1"
 * - Query still looks for exact username = "admin' OR '1'='1"
 * - No SQL injection possible
 *
 * NOTE: This function is kept for documentation but not used anymore
 * The query is built directly in the API endpoints now
 */
export function buildSecureLoginQuery(): string {
  return `SELECT * FROM Users WHERE username = ? AND password_hash = ?`;
}

/**
 * SECURE: Build parameterized register query
 * Parameters passed separately to prevent SQL Injection
 *
 * NOTE: This function is kept for documentation but not used anymore
 */
export function buildSecureRegisterQuery(): string {
  return `INSERT INTO Users (username, email, password_hash, salt, created_date) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
}

/**
 * SECURE: Build parameterized customer query
 * WHY THIS MATTERS:
 * - firstName, lastName, phone, email, sector are parameterized
 * - No XSS on stored data (even if someone tries to inject HTML)
 * - Data is stored as literal text, not as executable code
 * - When displayed, React automatically escapes HTML characters
 *
 * NOTE: This function is kept for documentation but not used anymore
 */
export function buildSecureCustomerQuery(): string {
  return `INSERT INTO Customers (user_id, first_name, last_name, phone, email, sector, subscription_package, created_date) 
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
}

/**
 * SECURE: Check if password is in weak password dictionary
 * SECURITY: Dictionary attack prevention
 */
export function checkPasswordDictionary(password: string): {
  isWeak: boolean;
  suggestion?: string;
} {
  try {
    const { getPasswordConfig, isWeakPassword } = require("./passwordConfig");
    const config = getPasswordConfig();

    if (config.dictionaryCheckEnabled && isWeakPassword(password)) {
      return {
        isWeak: true,
        suggestion:
          "This password is too common. Please choose a more unique password.",
      };
    }
  } catch (error) {
    console.warn("Could not check password dictionary:", error);
  }

  return { isWeak: false };
}

/**
 * SECURE: Validate password hasn't been used in last N times
 * SECURITY: Prevents password reuse attacks
 */
export async function validatePasswordHistory(
  userId: number,
  password: string,
  db: any,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { getPasswordConfig } = require("./passwordConfig");
    const config = getPasswordConfig();

    const userQuery = `SELECT password_history FROM Users WHERE id = ?`;
    const result = await db.get(userQuery, [userId]);

    if (!result || !result.password_history) {
      return { valid: true };
    }

    const passwordHashes: string[] = JSON.parse(
      result.password_history || "[]",
    );

    for (const oldHash of passwordHashes) {
      const isMatch = await comparePasswordsSecure(password, oldHash);
      if (isMatch) {
        return {
          valid: false,
          reason: `Cannot reuse a password from the last ${config.passwordHistory} times.`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating password history:", error);
    return { valid: true };
  }
}

/**
 * SECURE: Add current password to user's password history
 * SECURITY: Track previous passwords for reuse validation
 */
export async function addToPasswordHistory(
  userId: number,
  passwordHash: string,
  db: any,
): Promise<void> {
  try {
    const { getPasswordConfig } = require("./passwordConfig");
    const config = getPasswordConfig();

    const userQuery = `SELECT password_history FROM Users WHERE id = ?`;
    const result = await db.get(userQuery, [userId]);

    const passwordHistory: string[] = result
      ? JSON.parse(result.password_history || "[]")
      : [];

    passwordHistory.unshift(passwordHash);
    const trimmedHistory = passwordHistory.slice(0, config.passwordHistory);

    const updateQuery = `UPDATE Users SET password_history = ? WHERE id = ?`;
    await db.run(updateQuery, [JSON.stringify(trimmedHistory), userId]);
  } catch (error) {
    console.error("Error adding to password history:", error);
  }
}

export default {
  generateSalt,
  hashPasswordSecure,
  comparePasswordsSecure,
  validatePasswordPolicy,
  buildSecureLoginQuery,
  buildSecureRegisterQuery,
  buildSecureCustomerQuery,
  generatePasswordResetToken,
};
