import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecial: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Live password validation
    if (name === "password") {
      setPasswordValidation({
        minLength: value.length >= 10,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasDigit: /\d/.test(value),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
      });
    }
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
        setMessage("✓ Registration successful! Redirecting to login...");
        setFormData({
          username: "",
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setMessage("✗ " + data.message);
        if (data.errors) setErrors(data.errors);
      }
    } catch (error: any) {
      setMessage("✗ Error: " + error.message);
    }
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasDigit &&
    passwordValidation.hasSpecial;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Register - Communication_LTD</h1>
        <p style={styles.secure}>✓ SECURE VERSION - Production Ready</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h3>Account Information</h3>
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
          </div>

          <div style={styles.section}>
            <h3>Personal Information</h3>
            <input
              type="text"
              name="firstName"
              placeholder="First Name (optional)"
              value={formData.firstName}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              type="text"
              name="lastName"
              placeholder="Last Name (optional)"
              value={formData.lastName}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.section}>
            <h3>Password</h3>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <div style={styles.passwordRequirements}>
              <p style={{ margin: "5px 0" }}>Password Requirements:</p>
              <div style={styles.requirement}>At least 10 characters</div>
              <div style={styles.requirement}>Uppercase letter</div>
              <div style={styles.requirement}>Lowercase letter</div>
              <div style={styles.requirement}>Digit</div>
              <div style={styles.requirement}>Special character</div>
            </div>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: isPasswordValid ? 1 : 0.5,
              cursor: isPasswordValid ? "pointer" : "not-allowed",
            }}
            disabled={!isPasswordValid}
          >
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
              <p key={i} style={{ margin: "5px 0" }}>
                • {err}
              </p>
            ))}
          </div>
        )}

        <p style={styles.link}>
          Already have an account? <Link href="/login">Login here</Link>
        </p>

        <p style={styles.note}>
          🟢 SECURE: Passwords hashed with bcryptjs. Parameterized queries
          prevent SQL injection. Password history tracked to prevent reuse.
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
    maxWidth: "600px",
    width: "100%",
  },
  secure: {
    color: "#2e7d32",
    fontWeight: "bold" as const,
    marginBottom: "20px",
  },
  form: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "15px",
  },
  section: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "10px",
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  passwordRequirements: {
    padding: "10px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    fontSize: "12px",
  },
  requirement: {
    padding: "3px 0",
    fontSize: "12px",
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
  },
  errors: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    color: "#c62828",
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
