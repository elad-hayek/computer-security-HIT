import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";

type ResponseData = {
  success: boolean;
  message: string;
  customer?: any;
};

/**
 * SECURE Add Customer API Endpoint
 * POST /api/customers/add
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Input validation on all fields
 * 3. No manual escaping needed (SQLite handles it)
 * 4. When displayed, React auto-escapes HTML (prevents XSS)
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

  // Input validation
  if (firstName.length > 250 || lastName.length > 250) {
    return res
      .status(400)
      .json({ success: false, message: "Name fields too long" });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }

  try {
    // SECURE: Use parameterized query
    // All user inputs are passed as parameters
    // SQLite treats them as data, not code
    const query = `INSERT INTO Customers (user_id, first_name, last_name, phone, email, sector, subscription_package, created_date) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

    const db = await getConnection();

    // SECURE: Execute query with parameters
    // WHY: Even if firstName = "<img src=x onerror='alert(1)'>", it's stored as literal text
    // No HTML tags are interpreted by SQLite
    await db.run(query, [
      userId,
      firstName,
      lastName,
      phone,
      email,
      sector,
      subscriptionPackage,
    ]);

    return res.status(201).json({
      success: true,
      message: `Customer '${firstName} ${lastName}' added successfully (SECURE VERSION)`,
      customer: {
        firstName,
        lastName,
        email,
        sector,
      },
    });
  } catch (error: any) {
    console.error("Add customer error:", error);

    // SECURE: Generic error message
    return res.status(500).json({
      success: false,
      message: "Failed to add customer",
    });
  }
}
