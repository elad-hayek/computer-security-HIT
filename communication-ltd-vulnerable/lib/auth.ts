// VULNERABLE VERSION - SQL Injection & XSS vulnerabilities
// Uses HMAC-SHA256 for password hashing (same as secure) but vulnerable queries
// This file demonstrates INSECURE authentication practices for educational purposes

import crypto from "crypto";
import { allAsync, runAsync } from "./db";
import { getPasswordConfig, isWeakPassword } from "./passwordConfig";

/**
 * Hash password using HMAC-SHA256 with salt
 * Same secure hashing as secure version (no vulnerability in hashing itself)
 * Vulnerability comes from SQL query construction in API endpoints
 *
 * IMPLEMENTATION:
 * - Salt: Random 10-byte hex-encoded value
 * - Algorithm: HMAC-SHA256
 * - Output: Hex-encoded HMAC hash
 */
export async function hashPasswordHMAC(
  password: string,
  salt: string,
): Promise<string> {
  // Same as secure version - uses crypto module built into Node.js
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(password);
  return hmac.digest("hex");
}

/**
 * Generate random salt for password hashing
 * Returns 10-byte random salt as hex string
 * Same as secure version
 */
export function generateSalt(): string {
  return crypto.randomBytes(10).toString("hex");
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
 * Check if password is in weak password dictionary
 * Dictionary attack prevention
 */
export function checkPasswordDictionary(password: string): {
  isWeak: boolean;
  suggestion?: string;
} {
  try {
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
 * Check password history with SQL injection risk
 * Uses string concatenation instead of parameterized queries
 */
export async function checkPasswordHistory(
  userId: number,
  password: string,
  db: any,
  config: any,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const query = `
      SELECT password_hash, salt FROM PasswordHistory 
      WHERE user_id = ${userId} 
      ORDER BY created_date DESC 
      LIMIT ${config.passwordHistory}
    `;
    const results = await allAsync(db, query);

    // Check if new password matches any of the last N passwords
    for (const row of results) {
      // Compute HMAC hash of new password with historical salt
      const computedHash = await hashPasswordHMAC(password, row.salt);
      if (computedHash === row.password_hash) {
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
 * Add password to history with SQL injection
 * Uses string concatenation for database queries
 */
export async function addPasswordToHistory(
  userId: number,
  passwordHash: string,
  salt: string,
  db: any,
): Promise<void> {
  try {
    const query = `
      INSERT INTO PasswordHistory (user_id, password_hash, salt, created_date)
      VALUES (${userId}, '${passwordHash}', '${salt}', CURRENT_TIMESTAMP)
    `;
    await runAsync(db, query);
  } catch (error) {
    console.error("Error adding password to history:", error);
  }
}

export default {
  validatePasswordPolicy,
  checkPasswordDictionary,
  checkPasswordHistory,
  addPasswordToHistory,
};
