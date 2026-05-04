import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, runAsync } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/cookies";
import { validateName, validateEmailOptional } from "@/lib/validation";

type ResponseData = {
  success: boolean;
  message?: string;
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
  };
};

/**
 * SECURE Add Customer API Endpoint
 * POST /api/customers/add
 *
 * Creates a new customer record
 *
 * SECURITY FEATURES:
 * 1. Parameterized INSERT query prevents SQL injection
 * 2. Input validation for required fields
 * 3. All user input treated as data, not code
 * 4. Secure error messages (no SQL details)
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

  // SECURE: Check authentication
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { firstName, lastName, email } = req.body;

  // Validate inputs
  const firstNameValidation = validateName(firstName, "First name");
  if (!firstNameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: firstNameValidation.error || "Invalid first name",
    });
  }

  const lastNameValidation = validateName(lastName, "Last name");
  if (!lastNameValidation.valid) {
    return res.status(400).json({
      success: false,
      message: lastNameValidation.error || "Invalid last name",
    });
  }

  const emailValidation = validateEmailOptional(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: emailValidation.error || "Invalid email",
    });
  }

  // Extract validated and sanitized values
  const validatedFirstName = firstNameValidation.value;
  const validatedLastName = lastNameValidation.value;
  const validatedEmail = emailValidation.value;

  try {
    try {
      const db = await getConnection();

      // SECURE: Use parameterized INSERT query
      // WHY: SQLite treats ? as data placeholder, not code
      // Even if firstName/lastName/email contain SQL injection attempts,
      // they are treated as literal string values for database fields
      const insertQuery = `
        INSERT INTO Customers (first_name, last_name, email, created_date, updated_date)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = await runAsync(db, insertQuery, [
        validatedFirstName,
        validatedLastName,
        validatedEmail,
      ]);

      return res.status(201).json({
        success: true,
        message: "Customer added successfully",
        customer: {
          id: result.lastID || 0,
          first_name: validatedFirstName,
          last_name: validatedLastName,
          email: validatedEmail,
        },
      });
    } catch (error) {
      console.error("Customer add error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to add customer",
      });
    }
  } finally {
    await closeConnection();
  }
}
