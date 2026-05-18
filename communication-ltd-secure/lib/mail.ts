import nodemailer from "nodemailer";

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send password reset email with reset code
 * @param email - Recipient email address
 * @param token - Password reset token (6-digit or hexadecimal code)
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const htmlContent = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your Communication LTD account.</p>
    <p>Use this code to reset your password:</p>
    <h3 style="font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px;">${token}</h3>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">This code expires in 1 hour. If you didn't request this, ignore this email.</p>
  `;

  const mailOptions = {
    from: process.env.GMAIL_FROM_EMAIL || process.env.GMAIL_USER,
    to: email,
    subject: "Password Reset Code - Communication LTD",
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] Password reset email sent to ${email}. Message ID: ${info.messageId}`,
    );
  } catch (error: any) {
    console.error(
      `[EMAIL ERROR] Failed to send password reset email to ${email}:`,
      error.message,
    );
  }
}
