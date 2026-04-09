import type { NextApiRequest, NextApiResponse } from "next";
import { getPasswordConfig } from "@/lib/passwordConfig";

export interface PasswordConfigResponse {
  success: boolean;
  config: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigits: boolean;
    requireSpecialChars: boolean;
  };
}

/**
 * GET /api/config/password
 * Returns the current password policy configuration
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PasswordConfigResponse>,
) {
  if (req.method !== "GET") {
    res.status(405).json({
      success: false,
      config: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSpecialChars: true,
      },
    });
    return;
  }

  try {
    const config = getPasswordConfig();

    res.status(200).json({
      success: true,
      config: {
        minLength: config.minLength,
        requireUppercase: config.requireUppercase,
        requireLowercase: config.requireLowercase,
        requireDigits: config.requireDigits,
        requireSpecialChars: config.requireSpecialChars,
      },
    });
  } catch (error) {
    console.error("Failed to fetch password config:", error);
    res.status(500).json({
      success: false,
      config: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSpecialChars: true,
      },
    });
  }
}
