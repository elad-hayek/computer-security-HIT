// VULNERABLE VERSION - No password hashing, direct SQL concatenation
// This file demonstrates INSECURE authentication practices for educational purposes

import crypto from "crypto";

/**
 * VULNERABLE: Generate a "salt" but it's not actually used securely
 * Returns a random value but won't prevent attacks
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * VULNERABLE: Generate password reset token without proper protection
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * VULNERABLE: Store password as plain text
 * WARNING: This is EXTREMELY insecure!
 *
 * WHY THIS IS VULNERABLE:
 * - If database is breached, all passwords are immediately compromised
 * - Anyone with database access can see all user passwords
 * - No protection against rainbow tables or dictionary attacks
 * - Violates GDPR, HIPAA, and all security standards
 *
 * WHAT ATTACKERS CAN DO:
 * - Use the passwords on other sites (password reuse is common)
 * - Impersonate users
 * - Access sensitive customer information
 */
export function hashPasswordVulnerable(password: string, salt: string): string {
  // VULNERABLE: Return plain text password
  return password;
}

/**
 * VULNERABLE: Compare plain text passwords
 * No protection against timing attacks
 */
export function comparePasswordsVulnerable(
  provided: string,
  stored: string,
): boolean {
  // VULNERABLE: Direct string comparison (timing attack possible)
  return provided === stored;
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
  salt: string,
): string {
  // VULNERABLE: Direct string concatenation
  // Attack example: username = "' OR '1'='1'; DROP TABLE Users; --"
  return `INSERT INTO Users (username, email, password_hash, salt, created_date) VALUES ('${username}', '${email}', '${passwordHash}', '${salt}', CURRENT_TIMESTAMP)`;
}

export function buildVulnerableCustomerQuery(
  userId: number,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  sector: string,
  package: string,
): string {
  // VULNERABLE: Direct string concatenation with user input
  // XSS risk when data is retrieved: firstName = "<img src=x onerror='alert(1)'>"
  return `INSERT INTO Customers (user_id, first_name, last_name, phone, email, sector, subscription_package, created_date) VALUES (${userId}, '${firstName}', '${lastName}', '${phone}', '${email}', '${sector}', '${package}', CURRENT_TIMESTAMP)`;
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
      const isMatch = comparePasswordsVulnerable(password, row.password_hash);
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
  generateSalt,
  generatePasswordResetToken,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
  validatePasswordPolicy,
  checkPasswordHistory,
  addPasswordToHistory,
  buildVulnerableLoginQuery,
  buildVulnerableRegisterQuery,
  buildVulnerableCustomerQuery,
  validatePasswordHistory,
  addToPasswordHistory,
};
