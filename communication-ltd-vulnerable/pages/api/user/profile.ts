import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, allAsync } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/cookies";

type ResponseData = {
  success: boolean;
  message?: string;
  customers?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
  }>;
};

/**
 * VULNERABLE Customers List API Endpoint
 * GET /api/user/profile
 *
 * Retrieves all customers from the database
 *
 * VULNERABILITIES:
 * 1. SQL Injection via string concatenation in query
 * 2. Direct string concatenation allows arbitrary SQL
 * 3. No input sanitization or validation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  // VULNERABLE: Extract userId from authentication cookie
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    try {
      const db = await getConnection();

      // VULNERABLE: SQL injection via string concatenation
      // Could inject SQL through userId if it were from user input
      const customersQuery = `
        SELECT id, first_name, last_name, email 
        FROM Customers
        ORDER BY first_name, last_name
      `;

      const customers = await allAsync(db, customersQuery);

      return res.status(200).json({
        success: true,
        customers: customers,
      });
    } catch (error: any) {
      console.error("Customers fetch error:", error);
      // VULNERABLE: May expose error details
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  } finally {
    await closeConnection();
  }
}
