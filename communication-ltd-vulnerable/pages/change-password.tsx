import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates password change vulnerabilities

export default function ChangePassword() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    oldPassword: "",
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

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

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

    if (!userId) {
      setSuccess(false);
      setMessage("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      // VULNERABILITY: oldPassword not verified in vulnerable API endpoint
      // An attacker could change password without knowing current password
      // by modifying the userId in localStorage to another user's ID
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setMessage("Password changed successfully! Redirecting...");
        setFormData({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setSuccess(false);
        setMessage(data.message);
        if (data.errors) setErrors(data.errors);
      }
    } catch (error: any) {
      setSuccess(false);
      setMessage("Error: " + error.message);
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

  if (!userId) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Change Password - Communication_LTD</h1>
        <p style={styles.vulnerable}>
          ⚠ VULNERABLE VERSION - Security Flaws Demonstrated
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            {/* VULNERABILITY: oldPassword field present but not validated on backend */}
            {/* The vulnerable endpoint doesn't check this field */}
            <input
              type="password"
              name="oldPassword"
              placeholder="Current Password (ignored by vulnerable backend)"
              value={formData.oldPassword}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={isLoading}
            />

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
            {isLoading ? "Changing Password..." : "Change Password"}
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
          <Link href="/dashboard">Back to Dashboard</Link>
        </p>

        <p style={styles.note}>
          🔴 VULNERABLE: Backend doesn't verify old password. SQL injection in
          password history check. No verification that userId in localStorage
          matches actual session. Password not hashed securely.
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
