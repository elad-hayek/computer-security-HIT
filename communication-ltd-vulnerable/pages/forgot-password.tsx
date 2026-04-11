import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates account enumeration, SQL injection, and weak token handling

interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecialChars: boolean;
}

export default function ForgotPassword() {
  const router = useRouter();
  const { token: tokenFromQuery } = router.query;

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Email
  const [email, setEmail] = useState("");

  // Step 3: Reset Password
  const [token, setToken] = useState(tokenFromQuery ? String(tokenFromQuery) : "");
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Common state
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

  // If token in URL, start at step 3
  useEffect(() => {
    if (tokenFromQuery) {
      setCurrentStep(3);
      setToken(String(tokenFromQuery));
    }
  }, [tokenFromQuery]);

  useEffect(() => {
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

  // Step 1: Handle email submission
  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setErrors([]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "requestToken" }),
      });

      const data = await res.json();

      // VULNERABILITY: Account enumeration - different messages for different cases
      if (data.success) {
        setSuccess(true);
        setMessage("Check your email for the password reset token. (Check console for token in demo)");
        setCurrentStep(2);
      } else {
        // VULNERABILITY: This reveals if email exists in the system
        setSuccess(false);
        setMessage(data.message || "Error requesting token");
      }
    } catch (error: any) {
      setSuccess(false);
      setMessage("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Handle password change with token
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // VULNERABILITY: No input validation
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setErrors([]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
          action: "resetPassword",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setMessage("Password reset successfully! Redirecting to login...");
        setFormData({ newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setSuccess(false);
        setMessage(data.message || "Error resetting password");
        if (data.errors) setErrors(data.errors);
      }
    } catch (error: any) {
      setSuccess(false);
      setMessage("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToStep3 = () => {
    if (!token.trim()) {
      setMessage("Please enter the token from your email");
      return;
    }
    setCurrentStep(3);
    setMessage("");
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
    return formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0;
  })();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Forgot Password - Communication_LTD</h1>
        <p style={styles.vulnerable}>⚠ VULNERABLE VERSION - Security Flaws Demonstrated</p>

        <div style={styles.stepIndicator}>
          <div style={styles.stepDot(currentStep >= 1)}>1</div>
          <div style={styles.stepLine(currentStep >= 2)} />
          <div style={styles.stepDot(currentStep >= 2)}>2</div>
          <div style={styles.stepLine(currentStep >= 3)} />
          <div style={styles.stepDot(currentStep >= 3)}>3</div>
        </div>
        <p style={styles.stepLabel}>Step {currentStep} of 3</p>

        {/* Step 1: Request Token */}
        {currentStep === 1 && (
          <>
            <p style={styles.description}>
              Enter your email address to receive a password reset token.
            </p>

            <form onSubmit={handleRequestToken} style={styles.form}>
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
                {isLoading ? "Sending..." : "Request Reset Token"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Token Sent Message */}
        {currentStep === 2 && (
          <>
            <p style={styles.description}>
              We've sent a password reset token to your email address.
            </p>

            <div style={styles.section}>
              <p style={{ color: "#d32f2f", fontWeight: "bold" }}>
                ✓ Token sent to {email}
              </p>

              <input
                type="text"
                placeholder="Enter token from email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                style={styles.input}
              />

              <button
                type="button"
                onClick={handleProceedToStep3}
                style={styles.button}
              >
                Proceed to Reset Password
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setEmail("");
                  setToken("");
                  setMessage("");
                }}
                style={styles.backButton}
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {/* Step 3: Reset Password */}
        {currentStep === 3 && (
          <>
            <p style={styles.description}>
              Enter your new password. Make sure it meets all requirements.
            </p>

            <form onSubmit={handleResetPassword} style={styles.form}>
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

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={styles.input}
                disabled={isLoading}
              />

              <div style={styles.passwordRequirements}>
                <p style={{ margin: "5px 0", fontWeight: "bold" }}>Password Requirements:</p>
                {passwordConfig.minLength > 0 && (
                  <div
                    style={{
                      ...styles.requirement,
                      color: passwordValidation.minLength ? "green" : "gray",
                    }}
                  >
                    ✓ At least {passwordConfig.minLength} characters
                  </div>
                )}
                {passwordConfig.requireUppercase && (
                  <div
                    style={{
                      ...styles.requirement,
                      color: passwordValidation.hasUppercase ? "green" : "gray",
                    }}
                  >
                    ✓ Uppercase letter (A-Z)
                  </div>
                )}
                {passwordConfig.requireLowercase && (
                  <div
                    style={{
                      ...styles.requirement,
                      color: passwordValidation.hasLowercase ? "green" : "gray",
                    }}
                  >
                    ✓ Lowercase letter (a-z)
                  </div>
                )}
                {passwordConfig.requireDigits && (
                  <div
                    style={{
                      ...styles.requirement,
                      color: passwordValidation.hasDigit ? "green" : "gray",
                    }}
                  >
                    ✓ Number (0-9)
                  </div>
                )}
                {passwordConfig.requireSpecialChars && (
                  <div
                    style={{
                      ...styles.requirement,
                      color: passwordValidation.hasSpecial ? "green" : "gray",
                    }}
                  >
                    ✓ Special character (!@#$%^&*)
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={styles.button}
                disabled={isLoading || !isPasswordValid}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  setMessage("");
                }}
                style={styles.backButton}
              >
                ← Back
              </button>
            </form>
          </>
        )}

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
          <div style={styles.errorList}>
            {errors.map((error, index) => (
              <div key={index} style={styles.errorItem}>
                • {error}
              </div>
            ))}
          </div>
        )}

        <p style={styles.link}>
          Remember your password? <Link href="/login">Login here</Link>
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
  stepIndicator: {
    display: "flex" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  stepDot: (isActive: boolean) => ({
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex" as const,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isActive ? "#d32f2f" : "#ddd",
    color: isActive ? "white" : "#999",
    fontWeight: "bold" as const,
    fontSize: "14px",
  }),
  stepLine: (isActive: boolean) => ({
    width: "30px",
    height: "2px",
    backgroundColor: isActive ? "#d32f2f" : "#ddd",
  }),
  stepLabel: {
    textAlign: "center" as const,
    fontSize: "12px",
    color: "#666",
    marginBottom: "20px",
    fontWeight: "bold" as const,
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
  section: {
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
  backButton: {
    padding: "10px",
    backgroundColor: "#f0f0f0",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "14px",
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
  },
  passwordRequirements: {
    padding: "10px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    fontSize: "12px",
  },
  requirement: {
    margin: "5px 0",
    fontSize: "12px",
  },
  errorList: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    borderLeft: "3px solid #d32f2f",
  },
  errorItem: {
    color: "#c62828",
    fontSize: "12px",
    margin: "5px 0",
  },
};
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
