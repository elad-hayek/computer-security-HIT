import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecialChars: boolean;
}

export default function ChangePassword() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig>({
    minLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireDigits: true,
    requireSpecialChars: true,
  });
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecial: false,
  });

  useEffect(() => {
    // Check for authentication
    const storedUserId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!storedUserId) {
      router.push("/login");
    } else {
      setUserId(Number(storedUserId));
    }
  }, [router]);

  useEffect(() => {
    // Fetch password config from backend
    const fetchPasswordConfig = async () => {
      try {
        const res = await fetch("/api/config/password");
        const data = await res.json();
        if (data.success && data.config) {
          setPasswordConfig(data.config);
        }
      } catch (error) {
        console.error("Failed to fetch password config:", error);
      }
    };

    fetchPasswordConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Live password validation
    if (name === "newPassword") {
      setPasswordValidation({
        minLength: value.length >= passwordConfig.minLength,
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

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...formData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setMessage("Password changed successfully!");
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

  const isPasswordValid = (() => {
    if (passwordConfig.minLength && !passwordValidation.minLength) return false;
    if (passwordConfig.requireUppercase && !passwordValidation.hasUppercase)
      return false;
    if (passwordConfig.requireLowercase && !passwordValidation.hasLowercase)
      return false;
    if (passwordConfig.requireDigits && !passwordValidation.hasDigit)
      return false;
    if (passwordConfig.requireSpecialChars && !passwordValidation.hasSpecial)
      return false;
    return true;
  })();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Change Password - Communication_LTD</h1>
        <p style={styles.secure}>SECURE VERSION - Production Ready</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            name="oldPassword"
            placeholder="Current Password"
            value={formData.oldPassword}
            onChange={handleChange}
            required
            style={styles.input}
            disabled={isLoading}
          />

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
              {passwordConfig.minLength > 0 && (
                <div
                  style={{
                    ...styles.requirement,
                    color: passwordValidation.minLength ? "green" : "gray",
                  }}
                >
                  At least {passwordConfig.minLength} characters
                </div>
              )}
              {passwordConfig.requireUppercase && (
                <div
                  style={{
                    ...styles.requirement,
                    color: passwordValidation.hasUppercase ? "green" : "gray",
                  }}
                >
                  Uppercase letter
                </div>
              )}
              {passwordConfig.requireLowercase && (
                <div
                  style={{
                    ...styles.requirement,
                    color: passwordValidation.hasLowercase ? "green" : "gray",
                  }}
                >
                  Lowercase letter
                </div>
              )}
              {passwordConfig.requireDigits && (
                <div
                  style={{
                    ...styles.requirement,
                    color: passwordValidation.hasDigit ? "green" : "gray",
                  }}
                >
                  Digit
                </div>
              )}
              {passwordConfig.requireSpecialChars && (
                <div
                  style={{
                    ...styles.requirement,
                    color: passwordValidation.hasSpecial ? "green" : "gray",
                  }}
                >
                  Special character
                </div>
              )}
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
          🟢 SECURE: Password history checked to prevent reuse. Bcryptjs hashing
          used.
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
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #2e7d32",
  },
};
