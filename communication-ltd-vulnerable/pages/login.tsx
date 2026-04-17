import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // VULNERABLE: No localStorage needed with cookie-based auth
        // Auth cookie is automatically set by server and sent with requests
        // But still vulnerable to SQL injection attacks in backend
        setSuccess(true);
        setMessage("Login successful! Redirecting to dashboard...");

        setTimeout(() => {
          localStorage.setItem("userId", data.user.id);
          router.push("/dashboard");
        }, 1500);
      } else {
        // Error message from backend (matches secure version now)
        setSuccess(false);
        setMessage(data.message);
      }
    } catch (error: any) {
      setIsError(true);
      setMessage("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Login - Communication_LTD</h1>
        <p style={styles.vulnerable}>⚠ VULNERABLE VERSION - Educational Purpose</p>

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
          />

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              color: isError ? "red" : "green",
            }}
          >
            {message}
          </div>
        )}

        <div style={styles.links}>
          <p>
            Don't have an account? <Link href="/register">Register here</Link>
          </p>
          <p>
            Forgot your password?{" "}
            <Link href="/forgot-password">Reset it here</Link>
          </p>
        </div>

        <p style={styles.note}>
          🔴 VULNERABLE: SQL injection in backend query. No rate limiting.
          Session in localStorage (spoofable). No timing-safe password comparison.
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
    backgroundColor: "#2196F3",
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
    fontSize: "14px",
    textAlign: "center" as const,
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
