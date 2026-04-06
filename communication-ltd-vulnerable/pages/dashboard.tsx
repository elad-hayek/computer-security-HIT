import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates XSS and session management vulnerabilities

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // VULNERABILITY: No session validation - userId could be spoofed
    // An attacker could easily forge a userId in localStorage
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
      return;
    }

    // VULNERABILITY: No verification that this userId actually owns this session
    // An attacker could change their userId in developer tools to access another user's data
    setUserId(storedUserId);

    // Dummy data - in real vulnerable app, would fetch from API with user input without validation
    const dummyUser = {
      username: "demo_user",
      email: "demo@communication-ltd.com",
      firstName: "Demo",
      lastName: "User",
      phone: "+1-234-567-8900",
    };

    // VULNERABILITY: If API returns user data with unsanitized HTML/JS, it would execute
    // Example: If firstName is "<img src=x onerror='alert(1)'>", it would be dangerous
    // However, React auto-escapes in JSX, so XSS is less of a risk here
    // But a vulnerable API could still expose user data to wrong users
    setUserInfo(dummyUser);
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    // VULNERABILITY: No cookie clearing on server side
    // Only clearing localStorage - attackers could still use old sessions if cookies weren't HttpOnly
    localStorage.removeItem("userId");
    setMessage("Logging out...");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Dashboard - Communication_LTD</h1>
        <p style={styles.vulnerable}>
          ⚠ VULNERABLE VERSION - Session Flaws Demonstrated
        </p>

        <div style={styles.userInfoSection}>
          <h2>User Information</h2>
          {userInfo && (
            <div style={styles.userDetails}>
              <div style={styles.detailRow}>
                <span style={styles.label}>Username:</span>
                <span style={styles.value}>
                  {/* VULNERABILITY: No verification that this user data belongs to the logged-in user */}
                  {userInfo.username}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Email:</span>
                <span style={styles.value}>{userInfo.email}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Full Name:</span>
                <span style={styles.value}>
                  {/* VULNERABILITY: Unsanitized user data could contain HTML/JS */}
                  {userInfo.firstName && userInfo.lastName
                    ? `${userInfo.firstName} ${userInfo.lastName}`
                    : "Not provided"}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Phone:</span>
                <span style={styles.value}>
                  {userInfo.phone || "Not provided"}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>User ID:</span>
                <span style={styles.value}>
                  {/* VULNERABILITY: UserId directly from localStorage, not validated */}
                  {userId}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.actionsSection}>
          <h2>Actions</h2>
          <div style={styles.buttonGroup}>
            <Link href="/change-password" style={styles.linkButton}>
              <button style={styles.changePasswordButton}>
                🔐 Change Password
              </button>
            </Link>
            <Link href="/register" style={styles.linkButton}>
              <button style={styles.registerButton}>
                ➕ Register New User
              </button>
            </Link>
            <button style={styles.logoutButton} onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>

        {message && (
          <div style={{ ...styles.message, color: "blue" }}>
            {/* VULNERABILITY: Message not sanitized */}
            {message}
          </div>
        )}

        <p style={styles.note}>
          🔴 VULNERABLE: SessionId only in localStorage (easily spoofable). No
          server-side session validation. User data fetched without verifying
          ownership. No CSRF protection. Logout doesn't clear server session.
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
  vulnerable: {
    color: "#d32f2f",
    fontWeight: "bold" as const,
    marginBottom: "30px",
  },
  userInfoSection: {
    marginBottom: "30px",
    padding: "20px",
    backgroundColor: "#fff3f3",
    borderRadius: "4px",
    borderLeft: "4px solid #d32f2f",
  },
  userDetails: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "10px",
  },
  detailRow: {
    display: "flex" as const,
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
  },
  label: {
    fontWeight: "bold" as const,
    color: "#333",
    minWidth: "120px",
  },
  value: {
    color: "#666",
    textAlign: "right" as const,
    flex: 1,
  },
  actionsSection: {
    marginBottom: "20px",
  },
  buttonGroup: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "10px",
  },
  linkButton: {
    textDecoration: "none",
  },
  changePasswordButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "16px",
    fontWeight: "bold" as const,
  },
  registerButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "16px",
    fontWeight: "bold" as const,
  },
  logoutButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "16px",
    fontWeight: "bold" as const,
  },
  message: {
    marginTop: "15px",
    padding: "10px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
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
