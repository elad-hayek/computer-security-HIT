import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";

type ResponseData = {
  success: boolean;
  message?: string;
  customers?: any[];
  xss_warning?: string;
};

/**
 * VULNERABLE Get Customers API Endpoint
 * GET /api/customers?userId=1
 *
 * VULNERABILITY: STORED XSS
 * Returns customer data that might contain injected scripts
 * Frontend will execute these scripts!
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

  const { userId } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "userId parameter required" });
  }

  try {
    // VULNERABLE: Direct string concatenation
    const query = `SELECT id, first_name, last_name, phone, email, sector, subscription_package FROM Customers WHERE user_id = ${userId}`;

    const db = await getConnection();
    const result = await db.all(query);

    return res.status(200).json({
      success: true,
      customers: result,
      xss_warning:
        "[VULNERABLE] If customer first_name contains <img src=x onerror=alert(1)>, it will execute in the frontend!",
    });
  } catch (error: any) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers: " + error.message,
    });
  }
}
