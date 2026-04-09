import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates common Security vulnerabilities in password reset flows

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecial: false,
  });
  const [tokenStatus, setTokenStatus] = useState<
    "checking" | "valid" | "invalid"
  >("checking");

  useEffect(() => {
    if (token) {
      // VULNERABILITY: No validation of token before proceeding
      // An attacker could pass any string as token and get a password reset form
      setTokenStatus("valid");
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Live password validation (same as secure, for demo consistency)
    if (name === "newPassword") {
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
    setIsLoading(true);

    if (!token) {
      setSuccess(false);
      setMessage("Invalid reset link");
      setIsLoading(false);
      return;
    }

    try {
      // VULNERABILITY: XSS risk - Token from URL not sanitized
      // If attacker crafts: /reset-password?token=<img src=x onerror='alert(1)'>
      // The formData.newPassword could be affected if API echoes back token in response
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, // VULNERABILITY: Token passed unsanitized to API
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // VULNERABILITY: User input from API response directly rendered
        // If API returns: { message: "Password reset for <user input>" }
        // This creates stored XSS vulnerability
        setSuccess(true);
        setMessage("Password reset successfully! Redirecting to login...");
        setFormData({
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        // VULNERABILITY: User input from API response not HTML-escaped
        // Directly setting message from response could allow XSS
        setSuccess(false);
        setMessage(data.message); // VULNERABLE: No sanitization
        if (data.errors) setErrors(data.errors); // VULNERABLE: No sanitization of errors array
        setTokenStatus("invalid");
      }
    } catch (error: any) {
      // VULNERABILITY: Error messages might leak sensitive info
      setSuccess(false);
      setMessage("Error: " + error.message); // Shows raw error details
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasDigit &&
    passwordValidation.hasSpecial;

  if (tokenStatus === "checking") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>Reset Password - Communication_LTD</h1>
          <p style={{ color: "red" }}>
            Invalid or expired reset link. Please request a new one.
          </p>
          <Link href="/forgot-password">Request new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Reset Password - Communication_LTD</h1>
        <p style={styles.vulnerable}>
          ⚠ VULNERABLE VERSION - Security Flaws Demonstrated
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={isLoading}
            />

            <div style={styles.passwordRequirements}>
              <p style={{ margin: "5px 0" }}>Password Requirements:</p>
              <div
                style={{
                  ...styles.requirement,
                  color: passwordValidation.minLength ? "green" : "gray",
                }}
              >
                At least 10 characters
              </div>
              <div
                style={{
                  ...styles.requirement,
                  color: passwordValidation.hasUppercase ? "green" : "gray",
                }}
              >
                Uppercase letter
              </div>
              <div
                style={{
                  ...styles.requirement,
                  color: passwordValidation.hasLowercase ? "green" : "gray",
                }}
              >
                Lowercase letter
              </div>
              <div
                style={{
                  ...styles.requirement,
                  color: passwordValidation.hasDigit ? "green" : "gray",
                }}
              >
                Digit
              </div>
              <div
                style={{
                  ...styles.requirement,
                  color: passwordValidation.hasSpecial ? "green" : "gray",
                }}
              >
                Special character
              </div>
            </div>
          </div>

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={styles.input}
            disabled={isLoading}
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: isPasswordValid ? 1 : 0.5,
              cursor: isPasswordValid ? "pointer" : "not-allowed",
            }}
            disabled={!isPasswordValid || isLoading}
          >
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              color: success ? "green" : "red",
            }}
          >
            {/* VULNERABILITY: XSS - User input from API not sanitized */}
            {message}
          </div>
        )}

        {errors.length > 0 && (
          <div style={styles.errors}>
            {errors.map((err, i) => (
              <p key={i} style={{ margin: "5px 0" }}>
                {/* VULNERABILITY: XSS - Error messages not sanitized */}• {err}
              </p>
            ))}
          </div>
        )}

        <p style={styles.link}>
          <Link href="/login">Back to Login</Link>
        </p>

        <p style={styles.note}>
          🔴 VULNERABLE: No token expiry enforcement. No password history check.
          Token not in database. SQL Injection in backend allows attacker to
          reset any user's password. XSS in error messages.
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
    maxWidth: "500px",
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
    backgroundColor: "#fff3e0",
    borderRadius: "4px",
    fontSize: "12px",
  },
  requirement: {
    padding: "3px 0",
    fontSize: "12px",
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
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #d32f2f",
  },
};
