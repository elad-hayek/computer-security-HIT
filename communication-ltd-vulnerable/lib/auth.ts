// VULNERABLE VERSION - No password hashing, direct SQL concatenation
// This file demonstrates INSECURE authentication practices for educational purposes

import crypto from "crypto";

/**
 * VULNERABLE: Generate salt (but won't use it for hashing in this demo)
 * Shows what NOT to do in production
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
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
  return `INSERT INTO Users (username, email, password_hash, salt, created_date) VALUES ('${username}', '${email}', '${passwordHash}', '${salt}', GETDATE())`;
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
  return `INSERT INTO Customers (user_id, first_name, last_name, phone, email, sector, subscription_package, created_date) VALUES (${userId}, '${firstName}', '${lastName}', '${phone}', '${email}', '${sector}', '${package}', GETDATE())`;
}

export default {
  generateSalt,
  hashPasswordVulnerable,
  comparePasswordsVulnerable,
  validatePasswordPolicy,
  buildVulnerableLoginQuery,
  buildVulnerableRegisterQuery,
  buildVulnerableCustomerQuery,
};
