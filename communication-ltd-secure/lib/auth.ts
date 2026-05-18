import crypto from "crypto";
import { getPasswordConfig, isWeakPassword } from "./passwordConfig";
import { allAsync } from "./db";

/**
 * SECURE: Hash password using HMAC-SHA256 with salt
 */
export async function hashPasswordHMAC(
  password: string,
  salt: string,
): Promise<string> {
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(password);
  return hmac.digest("hex");
}

/**
 * SECURE: Generate random salt for password hashing
 * Returns 10-byte random salt as hex string
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
    // SECURE: Parameterized query to get last N password hashes and salts
    const query = `
      SELECT password_hash, salt FROM PasswordHistory 
      WHERE user_id = ? 
      ORDER BY created_date DESC 
      LIMIT ?
    `;
    const results = await allAsync(db, query, [userId, config.passwordHistory]);

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
 * SECURE: Add password to history
 * SECURITY: Track password changes for reuse prevention
 * Stores individual hash with timestamp in PasswordHistory table
 */
export async function addPasswordToHistory(
  userId: number,
  passwordHash: string,
  salt: string,
  db: any,
): Promise<void> {
  try {
    // SECURE: Parameterized insert query with salt
    const query = `
      INSERT INTO PasswordHistory (user_id, password_hash, salt, created_date)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await db.run(query, [userId, passwordHash, salt]);
  } catch (error) {
    console.error("Error adding password to history:", error);
  }
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

export default {
  validatePasswordPolicy,
  checkPasswordDictionary,
  checkPasswordHistory,
  addPasswordToHistory,
};
