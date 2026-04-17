import type { NextApiRequest, NextApiResponse } from "next";
import { getConnection, get } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/cookies";

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
 * VULNERABLE User Profile API Endpoint
 * GET /api/user/profile
 *
 * VULNERABILITIES:
 * 1. SQL Injection via string concatenation (userId parameter)
 * 2. No session validation - any userId accepted from client
 * 3. No verification that userId belongs to authenticated user
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
    const db = await getConnection();

    // VULNERABLE: SQL injection via string concatenation
    // Even though userId is numeric from cookie, demonstrates vulnerability
    // Attack: If userId could be a string, attacker could inject: userId = "1 OR 1=1"
    const profileQuery = `
      SELECT id, username, email, first_name, last_name, phone 
      FROM Users 
      WHERE id = ${userId}
    `;
    const user = await get(db, profileQuery);

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
