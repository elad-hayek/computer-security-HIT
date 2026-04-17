// VULNERABLE VERSION - SQL Injection & XSS vulnerabilities
// Uses bcrypt for password hashing (same as secure) but vulnerable queries
// This file demonstrates INSECURE authentication practices for educational purposes

import bcryptjs from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12; // bcryptjs salt rounds for hashing

/**
 * VULNERABLE: Generate password reset token without proper protection
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash password using bcryptjs (same as secure version)
 * NOTE: Password hashing is NOT the vulnerability in this project
 * The vulnerabilities are SQL Injection and XSS, not password handling
 */
export async function hashPasswordVulnerable(
  password: string,
): Promise<string> {
  // Use bcryptjs like secure version - password protection is not the vulnerability
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Compare passwords safely with bcryptjs (same as secure version)
 * NOTE: Password comparison is NOT the vulnerability in this project
 */
export async function comparePasswordsVulnerable(
  provided: string,
  stored: string,
): Promise<boolean> {
  // Use timing-safe comparison like secure version
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
 * Build vulnerable SQL queries with string concatenation
 * VULNERABLE: SQL Injection attacks possible
 */
/**
 * Build vulnerable SQL queries with string concatenation
 * VULNERABLE: SQL Injection attacks possible
 */
export function buildVulnerableLoginQuery(
  username: string,
  password: string,
): string {
  // VULNERABLE: Direct string concatenation
  // Attack example: username = "admin' --" bypasses password check
  return `SELECT * FROM Users WHERE username = '${username}' AND password_hash = '${password}'`;
}

export function buildVulnerableRegisterQuery(
  username: string,
  email: string,
  passwordHash: string,
): string {
  // VULNERABLE: Direct string concatenation
  // Attack example: username = "' OR '1'='1'; DROP TABLE Users; --"
  return `INSERT INTO Users (username, email, password_hash, created_date) VALUES ('${username}', '${email}', '${passwordHash}', CURRENT_TIMESTAMP)`;
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
    const results = await db.all(query);

    // Check if new password matches any of the last N passwords
    for (const row of results) {
      const isMatch = await comparePasswordsVulnerable(
        password,
        row.password_hash,
      );
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
    await db.run(query);
  } catch (error) {
    console.error("Error adding password to history:", error);
  }
}

/**
 * VULNERABLE: Legacy validation using JSON approach with SQL injection
 */
export async function validatePasswordHistory(
  userId: number,
  password: string,
  db: any,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { getPasswordConfig } = require("./passwordConfig");
    const config = getPasswordConfig();

    // VULNERABLE: String concatenation
    const userQuery = `SELECT password_history FROM Users WHERE id = ${userId}`;
    const result = await db.get(userQuery);

    if (!result || !result.password_history) {
      return { valid: true };
    }

    const passwordHashes: string[] = JSON.parse(
      result.password_history || "[]",
    );

    for (const oldHash of passwordHashes) {
      const isMatch = comparePasswordsVulnerable(password, oldHash);
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
 * VULNERABLE: Legacy function
 */
export async function addToPasswordHistory(
  userId: number,
  passwordHash: string,
  db: any,
): Promise<void> {
  return addPasswordToHistory(userId, passwordHash, db);
}

export default {
  generatePasswordResetToken,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
  validatePasswordPolicy,
  checkPasswordHistory,
  addPasswordToHistory,
  buildVulnerableLoginQuery,
  buildVulnerableRegisterQuery,
  validatePasswordHistory,
  addToPasswordHistory,
};
