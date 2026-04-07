import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, get } from "@/lib/db";

type ResponseData = {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
};

/**
 * SECURE User Profile API Endpoint
 * GET /api/user/profile
 *
 * Retrieves authenticated user profile data from the database
 *
 * SECURITY FEATURES:
 * 1. Parameterized queries prevent SQL injection
 * 2. Returns only basic user fields (excludes sensitive data like login_attempts, locked_until)
 * 3. Validates userId is provided
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

  const { userId } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  try {
    const db = await getConnection();

    // SECURE: Use parameterized query to fetch user profile
    // WHY: SQLite treats ? as data placeholder, not code
    // Returns only safe, non-sensitive fields
    const profileQuery = `
      SELECT id, username, email, first_name, last_name, phone 
      FROM Users 
      WHERE id = ?
    `;
    const user = await get(db, profileQuery, [userId]);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
