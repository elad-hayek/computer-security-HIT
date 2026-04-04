import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";
import sql from "mssql";

type ResponseData = {
  success: boolean;
  message?: string;
  customers?: any[];
};

/**
 * SECURE Get Customers API Endpoint
 * GET /api/customers?userId=1
 *
 * SECURITY:
 * Uses parameterized query
 * Frontend will auto-escape any HTML characters
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
    // SECURE: Parameterized query
    const pool = await getConnection();
    const request = pool.request();

    request.input("user_id", sql.Int, parseInt(userId as string));
    const query = `SELECT id, first_name, last_name, phone, email, sector, subscription_package 
                   FROM Customers WHERE user_id = @user_id`;

    const result = await request.query(query);

    return res.status(200).json({
      success: true,
      customers: result.recordset,
    });
  } catch (error: any) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers",
    });
  }
}
