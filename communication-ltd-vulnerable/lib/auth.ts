// VULNERABLE VERSION - SQL Injection & XSS vulnerabilities
// Uses bcrypt for password hashing (same as secure) but vulnerable queries
// This file demonstrates INSECURE authentication practices for educational purposes

import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { allAsync, runAsync } from "./db";

const SALT_ROUNDS = 12; // bcryptjs salt rounds for hashing

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
 * VULNERABLE: Check password history with SQL injection risk
 * Uses string concatenation instead of parameterized queries
 */
export async function checkPasswordHistory(
  userId: number,
  password: string,
  db: any,
  config: any,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // VULNERABLE: String concatenation - SQL injection possible
    // If userId is not properly validated/sanitized, attacker could craft SQL injection
    const query = `
      SELECT password_hash FROM PasswordHistory 
      WHERE user_id = ${userId} 
      ORDER BY created_date DESC 
      LIMIT ${config.passwordHistory}
    `;
    const results = await allAsync(db, query);

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
 * VULNERABLE: Add password to history with SQL injection
 * Uses string concatenation for database queries
 */
export async function addPasswordToHistory(
  userId: number,
  passwordHash: string,
  db: any,
): Promise<void> {
  try {
    // VULNERABLE: String concatenation in INSERT
    // If passwordHash contains quotes, it could break SQL syntax
    const query = `
      INSERT INTO PasswordHistory (user_id, password_hash, created_date)
      VALUES (${userId}, '${passwordHash}', CURRENT_TIMESTAMP)
    `;
    await runAsync(db, query);
  } catch (error) {
    console.error("Error adding password to history:", error);
  }
}

export default {
  hashPasswordSecure,
  comparePasswordsSecure,
  validatePasswordPolicy,
  checkPasswordHistory,
  addPasswordToHistory,
};
