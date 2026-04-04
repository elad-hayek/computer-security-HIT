import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import { buildVulnerableCustomerQuery } from "@/lib/auth";

type ResponseData = {
  success: boolean;
  message: string;
  customer?: any;
  xss_info?: string;
};

/**
 * VULNERABLE Add Customer API Endpoint
 * POST /api/customers/add
 *
 * VULNERABILITY #1: STORED XSS (Cross-Site Scripting)
 * Input is stored directly without encoding
 * Retrieved data is displayed without escaping
 *
 * ATTACK EXAMPLE:
 * firstName: <img src=x onerror='alert("XSS ATTACK")'>
 *
 * WHAT HAPPENS:
 * 1. Malicious HTML/JS is stored in database as-is
 * 2. When customer list is retrieved, the script executes in browser
 * 3. Attacker can steal cookies, redirect users, capture keystrokes, etc.
 *
 * WHY THIS IS BAD:
 * - Every user who views the customer list gets infected
 * - Persistent (stored in DB, affects all users)
 * - Can steal session tokens, credential harvesting
 * - Can modify page content, deface site
 *
 * VULNERABILITY #2: SQL INJECTION
 * Direct string concatenation allows SQL injection
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
    userId,
    firstName,
    lastName,
    phone,
    email,
    sector,
    subscriptionPackage,
  } = req.body;

  // Basic validation
  if (
    !userId ||
    !firstName ||
    !lastName ||
    !phone ||
    !email ||
    !sector ||
    !subscriptionPackage
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // VULNERABLE: Build query with string concatenation
    // This allows both SQL injection and XSS attacks!
    //
    // SQL INJECTION EXAMPLE:
    // firstName = "'); DROP TABLE Customers; --"
    // Would delete entire customers table!
    //
    // XSS EXAMPLE:
    // firstName = "<img src=x onerror='alert(\"XSS\")'>"
    // Stored in database, executes when displayed!
    const query = buildVulnerableCustomerQuery(
      userId,
      firstName,
      lastName,
      phone,
      email,
      sector,
      subscriptionPackage,
    );

    console.log("[DEBUG - VULNERABLE] Executing query:", query);

    const pool = await getConnection();

    // VULNERABLE: Direct query execution with concatenation
    const result = await pool.request().query(query);

    return res.status(201).json({
      success: true,
      message: `Customer added successfully`,
      customer: {
        firstName,
        lastName,
        email,
        sector,
      },
      xss_info: `[VULNERABLE] Try XSS: firstName="<img src=x onerror='alert(1)'>". Try SQL injection: firstName="'); DROP TABLE Customers; --"`,
    });
  } catch (error: any) {
    console.error("Add customer error:", error);

    // VULNERABLE: Reveals database errors
    return res.status(500).json({
      success: false,
      message: "Failed to add customer: " + error.message,
    });
  }
}
