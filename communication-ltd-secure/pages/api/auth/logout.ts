import type { NextApiRequest, NextApiResponse } from "next";
import { clearAuthCookie } from "@/lib/cookies";

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * SECURE Logout API Endpoint
 * POST /api/auth/logout
 *
 * Clears the authentication cookie
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

  // SECURE: Clear the auth cookie
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
