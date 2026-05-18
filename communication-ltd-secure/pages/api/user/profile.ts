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
 * SECURE Customers List API Endpoint
 * GET /api/user/profile
 *
 * Retrieves all customers from the database
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Authentication check ensures user is logged in
 * 3. Returns only safe customer fields
 * 4. Generic error messages (no information leakage)
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

  // Check authentication from cookie
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    try {
      const db = await getConnection();

      // Use parameterized query to fetch all customers
      const customersQuery = `
        SELECT id, first_name, last_name, email 
        FROM Customers
        ORDER BY first_name, last_name
      `;
      const customers = await allAsync(db, customersQuery, []);

      return res.status(200).json({
        success: true,
        customers: customers,
      });
    } catch (error) {
      console.error("Customers fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  } finally {
    await closeConnection();
  }
}
