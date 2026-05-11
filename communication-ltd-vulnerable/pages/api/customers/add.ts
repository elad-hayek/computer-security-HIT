import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, runAsync } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/cookies";

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
 * VULNERABLE Add Customer API Endpoint
 * POST /api/customers/add
 *
 * Creates a new customer record
 *
 * VULNERABILITIES:
 * 1. SQL Injection via string concatenation in INSERT query
 * 2. No input sanitization - stored XSS possible
 * 3. Direct string concatenation allows arbitrary SQL in firstName/lastName/email
 * 4. Example attack: firstName = "<img src=x onerror="alert(1)">" → Stored XSS
 * 5. Example attack: firstName = "test', 1234); DROP TABLE Customers; --" → SQL injection
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

  // VULNERABLE: Check authentication (same as secure)
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { firstName, lastName, email } = req.body;

  // Basic validation
  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: "First name and last name are required",
    });
  }

  try {
    try {
      const db = await getConnection();

      // VULNERABLE: Build INSERT query with string concatenation - SQL INJECTION POSSIBLE
      // Direct concatenation of user input into SQL query
      // Attack examples:
      //   firstName = "HACK', 'HACK', 'HACK@HACK.COM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('HACK2', 'HACK2', 'HACK2@HACK2.COM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)--"
      //   lastName = "'; DROP TABLE Customers; --"
      //   email = "test@test.com' UNION SELECT * FROM Users; --"
      //
      // Also vulnerable to STORED XSS:
      //   firstName = "<img src=x onerror=alert(1)>"
      //   This HTML is stored directly in the database and rendered in dashboard page
      const insertQuery = `
        INSERT INTO Customers (first_name, last_name, email, created_date, updated_date)
        VALUES ('${firstName}', '${lastName}', '${email || ""}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      console.log("Executing query:", insertQuery); // Log query for debugging (reveals vulnerability)

      // VULNERABLE: Direct string query execution
      var result = await runAsync(db, insertQuery);

      return res.status(201).json({
        success: true,
        message: "Customer added successfully",
        customer: {
          id: result.lastID || 0,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
        },
      });
    } catch (error: any) {
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
