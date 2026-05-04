import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, closeConnection, allAsync } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/cookies";
import { validateSearchTerm } from "@/lib/validation";

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
 * GET /api/customers/list?search=searchTerm
 *
 * Retrieves all customers with optional search filter
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Authentication check to ensure user is logged in
 * 3. Search term properly escaped with % wildcards for LIKE queries
 * 4. Returns only safe fields (no sensitive internal data)
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

  // SECURE: Check authentication
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    try {
      const db = await getConnection();

      // SECURE: Extract and validate search term
      const searchValidation = validateSearchTerm(req.query.search as string);
      if (!searchValidation.valid) {
        return res.status(400).json({
          success: false,
          message: searchValidation.error || "Invalid search term",
        });
      }
      const searchTerm = searchValidation.value;

      let query = `
        SELECT id, first_name, last_name, email 
        FROM Customers
      `;
      let params: any[] = [];

      // SECURE: Build parameterized query with search filter
      if (searchTerm) {
        // Search by first_name OR last_name using LIKE with wildcards
        // WHY: Parameterized queries treat % as literal data when in params array
        query += ` WHERE first_name LIKE ? OR last_name LIKE ?`;
        const searchPattern = `%${searchTerm}%`;
        params = [searchPattern, searchPattern];
      }

      query += ` ORDER BY first_name, last_name`;

      // SECURE: Use parameterized query to fetch customers
      // WHY: SQLite treats ? as data placeholder, not code
      const customers = await allAsync(db, query, params);

      return res.status(200).json({
        success: true,
        customers: customers,
      });
    } catch (error) {
      console.error("Customer list fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  } finally {
    await closeConnection();
  }
}
