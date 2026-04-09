import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

      setSuccess(true);
      setMessage(
        "If an account exists with this email, a reset link will be sent.",
      );
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
        <p style={styles.secure}>SECURE VERSION - Production Ready</p>

        <p style={styles.description}>
          Enter your email address and we'll send you a link to reset your
          password.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            disabled={isLoading}
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
            {message}
          </div>
        )}

        <p style={styles.link}>
          Remember your password? <Link href="/login">Login here</Link>
        </p>

        <p style={styles.note}>
          🟢 SECURE: No email enumeration - generic response sent. Reset tokens
          are SHA-1 hashed and expire after 1 hour.
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
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
  },
  secure: {
    color: "#2e7d32",
    fontWeight: "bold" as const,
    marginBottom: "20px",
  },
  description: {
    fontSize: "14px",
    color: "#666",
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
    backgroundColor: "#2e7d32",
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
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #2e7d32",
  },
};
