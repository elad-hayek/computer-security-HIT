import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates XSS and session management vulnerabilities

export default function Dashboard() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // VULNERABLE: Check auth by attempting to fetch profile
    // If cookie is invalid/missing, endpoint returns 401
    fetchUserProfile();
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // VULNERABLE: Send request with credentials (cookies)
      // Data is received but NOT escaped when displayed (XSS vulnerability)
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Auth failed - redirect to login
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUserInfo({
          username: data.user.username,
          email: data.user.email,
          firstName: data.user.first_name,
          lastName: data.user.last_name,
          phone: data.user.phone,
        });
      } else {
        setError("Failed to load user profile");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Error fetching user profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setMessage("Logging out...");
    // Clear auth cookie via logout endpoint
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).then(() => {
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    });
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
                {/* VULNERABLE XSS: Username rendered as HTML without escaping */}
                {/* Attack: Register with username = '<img src=x onerror="alert(\'XSS\')">' */}
                <span
                  style={styles.value}
                  dangerouslySetInnerHTML={{ __html: userInfo.username }}
                />
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Email:</span>
                {/* VULNERABLE XSS: Email rendered as HTML without escaping */}
                <span
                  style={styles.value}
                  dangerouslySetInnerHTML={{ __html: userInfo.email }}
                />
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Full Name:</span>
                {/* VULNERABLE XSS: First/Last name rendered as HTML without escaping */}
                <span
                  style={styles.value}
                  dangerouslySetInnerHTML={{
                    __html:
                      userInfo.firstName && userInfo.lastName
                        ? `${userInfo.firstName} ${userInfo.lastName}`
                        : "Not provided",
                  }}
                />
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Phone:</span>
                <span style={styles.value}>
                  {userInfo.phone || "Not provided"}
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

        {error && (
          <div style={{ ...styles.message, color: "red" }}>{error}</div>
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
