import { useState } from "react";
import Link from "next/link";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates account enumeration and email vulnerabilities

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // VULNERABILITY: No input validation for email
    // SQL injection possible in backend
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      // VULNERABILITY: Account Enumeration
      // Response reveals if an account exists or not
      // An attacker can discover valid email addresses in the system
      if (data.success) {
        // Specific success message means this email exists
        setSuccess(true);
        setMessage("Password reset email sent successfully!");
      } else if (data.message === "Email not found") {
        // Specific error message means email doesn't exist (enumeration!)
        setSuccess(false);
        setMessage(data.message); // VULNERABILITY: Reveals user doesn't exist
      } else {
        setSuccess(false);
        setMessage(data.message);
      }

      setEmail("");
    } catch (error: any) {
      setSuccess(false);
      setMessage("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Forgot Password - Communication_LTD</h1>
        <p style={styles.vulnerable}>
          ⚠ VULNERABLE VERSION - Security Flaws Demonstrated
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={handleChange}
            required
            style={styles.input}
            disabled={isLoading}
            autoComplete="email"
          />

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              color: success ? "green" : "red",
            }}
          >
            {/* VULNERABILITY: Message revealing account existence */}
            {message}
          </div>
        )}

        <p style={styles.link}>
          <Link href="/login">Back to Login</Link>
        </p>

        <p style={styles.note}>
          🔴 VULNERABLE: Account enumeration - reveals if email exists. No input
          validation. SQL injection possible in backend. Reset tokens not
          properly validated or expired. Email sending not implemented securely.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex" as const,
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "10px",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
  },
  vulnerable: {
    color: "#d32f2f",
    fontWeight: "bold" as const,
    marginBottom: "20px",
  },
  form: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "15px",
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  button: {
    padding: "10px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "16px",
  },
  message: {
    marginTop: "15px",
    padding: "10px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    textAlign: "center" as const,
  },
  link: {
    marginTop: "15px",
    textAlign: "center" as const,
    fontSize: "14px",
  },
  note: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #d32f2f",
  },
};
