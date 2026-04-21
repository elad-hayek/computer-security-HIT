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
 * GET /api/customers/list?search=searchTerm
 *
 * Retrieves all customers with optional search filter
 *
 * VULNERABILITIES:
 * 1. SQL Injection via string concatenation in search filter
 * 2. Direct string concatenation allows arbitrary SQL in search parameter
 * 3. Example attack: search="' OR '1'='1" returns all customers AND executes arbitrary SQL
 * 4. Example attack: search="'; DROP TABLE Customers; --" could delete data
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

  // VULNERABLE: Check authentication (same as secure)
  const userId = getAuthFromCookie(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    try {
      const db = await getConnection();

      // VULNERABLE: Extract search term without proper escaping
      const searchTerm = (req.query.search as string)?.trim() || "";

      let query = `
        SELECT id, first_name, last_name, email 
        FROM Customers
      `;

      // VULNERABLE: Build query with string concatenation - SQL INJECTION POSSIBLE
      // Direct concatenation of user input into SQL query
      // Attack examples:
      //   search = "' OR '1'='1" → WHERE first_name LIKE '' OR '1'='1' OR last_name LIKE '' OR '1'='1'
      //   search = "'; DELETE FROM Customers; --" → Adds DELETE statement
      //   search = "' UNION SELECT * FROM Users; --" → Exfiltrate user data
      if (searchTerm) {
        query += ` WHERE first_name LIKE '%${searchTerm}%' OR last_name LIKE '%${searchTerm}%'`;
      }

      query += ` ORDER BY first_name, last_name`;

      console.log("Executing query:", query); // Log query for debugging (reveals vulnerability)

      // VULNERABLE: Direct string query execution
      const customers = await allAsync(db, query);

      return res.status(200).json({
        success: true,
        customers: customers,
      });
    } catch (error: any) {
      console.error("Customer list fetch error:", error);
      // VULNERABLE: May expose SQL syntax errors in error messages
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  } finally {
    await closeConnection();
  }
}
