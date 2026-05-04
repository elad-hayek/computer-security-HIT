import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, getAsync, runAsync } from "@/lib/db";
import {
  validatePasswordPolicy,
  checkPasswordDictionary,
  hashPasswordHMAC,
  generateSalt,
  addPasswordToHistory,
} from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { getPasswordConfig } from "@/lib/passwordConfig";
import { escape as htmlEscape } from "html-escaper";
import {
  validateUsername,
  validateEmail,
  validateName,
  validatePhoneOptional,
  validatePasswordLength,
} from "@/lib/validation";

type ResponseData = {
  success: boolean;
  message: string;
  errors?: string[];
};

/**
 * SECURE Registration API Endpoint
 * POST /api/auth/register
 *
 * This endpoint demonstrates SECURE practices:
 * 1. Password hashing with HMAC-SHA256 and random salt
 * 2. Parameterized queries prevent SQL Injection
 * 3. Salt stored per user for password verification
 * 4. Password history tracking in separate table
 * 5. Proper error handling and validation
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

  const {
    username,
    email,
    firstName,
    lastName,
    phone,
    password,
    confirmPassword,
  } = req.body;

  // Basic validation
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(usernameValidation.error || ""),
    });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(emailValidation.error || ""),
    });
  }

  const firstNameValidation = validateName(firstName, "First name");
  if (!firstNameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(firstNameValidation.error || ""),
    });
  }

  const lastNameValidation = validateName(lastName, "Last name");
  if (!lastNameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(lastNameValidation.error || ""),
    });
  }

  const phoneValidation = validatePhoneOptional(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(phoneValidation.error || ""),
    });
  }

  const passwordValidation = validatePasswordLength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(passwordValidation.error || ""),
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: htmlEscape("Passwords do not match"),
    });
  }

  // Extract validated values
  const validatedUsername = usernameValidation.value;
  const validatedEmail = emailValidation.value;
  const validatedFirstName = firstNameValidation.value;
  const validatedLastName = lastNameValidation.value;
  const validatedPhone = phoneValidation.value;

  // Get password policy from config file
  const config = getPasswordConfig();

  // Validate password policy
  const validation = validatePasswordPolicy(password, config);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: htmlEscape("Password does not meet requirements"),
      errors: validation.errors,
    });
  }

  // SECURE: Check weak password dictionary
  const dictionaryCheck = checkPasswordDictionary(password);
  if (dictionaryCheck.isWeak) {
    return res.status(400).json({
      success: false,
      message: htmlEscape(
        dictionaryCheck.suggestion || "Password validation failed",
      ),
      errors: ["WEAK_PASSWORD"],
    });
  }

  try {
    try {
      const db = await getConnection();

      const existingUserQuery = `SELECT id FROM Users WHERE username = ? OR email = ?`;
      const existingUser = await getAsync(db, existingUserQuery, [
        validatedUsername,
        validatedEmail,
      ]);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      // SECURE: Generate random salt (16 bytes)
      const salt = generateSalt();

      // SECURE: Hash password with HMAC-SHA256 using the salt
      const passwordHash = await hashPasswordHMAC(password, salt);

      // SECURE: Use parameterized query with new fields including salt
      const query = `
        INSERT INTO Users (username, email, first_name, last_name, phone, password_hash, salt, created_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await runAsync(db, query, [
        validatedUsername,
        validatedEmail,
        validatedFirstName,
        validatedLastName,
        validatedPhone,
        passwordHash,
        salt,
      ]);

      // Get the newly created user's ID to add to password history
      const userQuery = `SELECT id FROM Users WHERE username = ?`;
      const user = await getAsync(db, userQuery, [validatedUsername]);

      if (user) {
        // Add initial password to history (with salt)
        await addPasswordToHistory(user.id, passwordHash, salt, db);

        // SECURE: Set HTTP-only cookie for authentication
        setAuthCookie(res, user.id);
      }

      return res.status(201).json({
        success: true,
        message: `User '${username}' registered successfully`,
      });
    } catch (error: any) {
      console.error("Registration error:", error);

      // Check if it's a duplicate username/email error
      if (
        error.message.includes("UNIQUE") ||
        error.message.includes("duplicate")
      ) {
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  } finally {
    await closeConnection();
  }
}
