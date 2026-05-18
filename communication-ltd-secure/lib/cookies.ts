import { NextApiRequest, NextApiResponse } from "next";

/**
 * Set HTTP-only authentication cookie
 * SECURITY: HTTP-only prevents XSS from accessing the cookie
 * Secure flag prevents transmission over non-HTTPS in production
 * SameSite=Strict allow only same-site requests to include the cookie
 */
export function setAuthCookie(
  res: NextApiResponse,
  userId: number,
  expiryHours: number = 24,
): void {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + expiryHours);

  res.setHeader(
    "Set-Cookie",
    `auth_token=${userId}; Path=/; HttpOnly; SameSite=Strict; Expires=${expiryDate.toUTCString()}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
}

/**
 * Get userId from authentication cookie
 * Safely extract and validate the auth token
 */
export function getAuthFromCookie(req: NextApiRequest): number | null {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith("auth_token="));

  if (!authCookie) {
    return null;
  }

  const userId = authCookie.split("=")[1];

  // Validate it's a valid number
  const parsedUserId = parseInt(userId, 10);
  if (isNaN(parsedUserId)) {
    return null;
  }

  return parsedUserId;
}

/**
 * Clear authentication cookie on logout
 */
export function clearAuthCookie(res: NextApiResponse): void {
  res.setHeader(
    "Set-Cookie",
    "auth_token=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 UTC",
  );
}
