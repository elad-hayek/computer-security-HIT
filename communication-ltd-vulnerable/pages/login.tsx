import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates session and input validation vulnerabilities

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // VULNERABILITY: No input validation - SQL injection possible on backend
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      // VULNERABILITY: Username/password sent unsanitized to API
      // Backend is vulnerable to SQL injection
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // VULNERABILITY: userId stored in localStorage - easily spoofable
        // An attacker can set any userId value and access another user's profile
        localStorage.setItem("userId", data.userId);

        // VULNERABILITY: Session ID not stored securely
        // Should be in HttpOnly cookie, not localStorage
        setMessage("✓ Login successful! Redirecting to dashboard...");

        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        // VULNERABILITY: Server timing can reveal if username exists (timing attacks)
        // Different response times for "user not found" vs "invalid password"
        setMessage("✗ " + data.message);
      }
    } catch (error: any) {
      // VULNERABILITY: Detailed error messages shown to attackers
      setMessage("✗ Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Login - Communication_LTD</h1>
        <p style={styles.vulnerable}>
          ⚠ VULNERABLE VERSION - Security Flaws Demonstrated
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
            style={styles.input}
            disabled={isLoading}
            autoComplete="username"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            style={styles.input}
            disabled={isLoading}
            autoComplete="current-password"
          />

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              color: message.includes("✓") ? "green" : "red",
            }}
          >
            {/* VULNERABILITY: Message not sanitized */}
            {message}
          </div>
        )}

        <div style={styles.links}>
          <Link href="/forgot-password">Forgot Password?</Link>
          <span> | </span>
          <Link href="/register">Register</Link>
        </div>

        <p style={styles.note}>
          🔴 VULNERABLE: Backend SQL injection in login query. SessionId in
          localStorage (spoofable). No timing-safe comparison. Plain-text
          password saved in intercepted requests. No rate limiting.
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
  links: {
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
