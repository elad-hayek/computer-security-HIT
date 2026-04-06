/**
 * VULNERABLE: Stored XSS Demonstration
 *
 * VULNERABILITY: This form displays error messages without HTML encoding
 *
 * XSS ATTACK EXAMPLE (Stored XSS):
 * If an attacker enters this as username:
 * <img src=x onerror="alert('Stored XSS on ' + document.domain)">
 *
 * And this payload gets stored in database, then displayed here
 * without htmlEncode(), the JavaScript will execute in every user's browser.
 *
 * FIX: Use htmlEncode() when displaying user data, or let React JSX auto-escape
 */

import { useState } from "react";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setErrors([]);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✓ Registration successful!");
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        setMessage("✗ " + data.message);
        if (data.errors) setErrors(data.errors);
      }
    } catch (error: any) {
      setMessage("✗ Error: " + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Register - Communication_LTD</h1>
        <p style={styles.vulnerability}>
          ⚠️ VULNERABLE VERSION - DO NOT USE IN PRODUCTION
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
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <input
            type="password"
            name="password"
            placeholder="Password (min 10 chars, uppercase, lowercase, digit, special)"
            value={formData.password}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Register
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              color: message.includes("✓") ? "green" : "red",
            }}
          >
            {message}
          </div>
        )}

        {errors.length > 0 && (
          <div style={styles.errors}>
            {errors.map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

        <p style={styles.note}>
          🔴 VULNERABLE: Passwords stored as plain text! Try SQL injection in
          username: {'">DROP TABLE Users; --'}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
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
    maxWidth: "500px",
    width: "100%",
  },
  vulnerability: {
    color: "#d32f2f",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
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
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
  },
  message: {
    marginTop: "15px",
    padding: "10px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
  },
  errors: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    color: "#c62828",
  },
  note: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#fff3e0",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #f57c00",
  },
};
