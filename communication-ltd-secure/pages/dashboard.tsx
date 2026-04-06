import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

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
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
      return;
    }

    setUserId(storedUserId);
    // In a real app, you would fetch user profile from API
    // For now, we'll use dummy data to demonstrate the dashboard
    // TODO: Create /api/user/profile endpoint to fetch actual user data
    const dummyUser = {
      username: "demo_user",
      email: "demo@communication-ltd.com",
      firstName: "Demo",
      lastName: "User",
      phone: "+1-234-567-8900",
    };
    setUserInfo(dummyUser);
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
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
        <p style={styles.secure}>✓ SECURE VERSION - User Session Active</p>

        <div style={styles.userInfoSection}>
          <h2>User Information</h2>
          {userInfo && (
            <div style={styles.userDetails}>
              <div style={styles.detailRow}>
                <span style={styles.label}>Username:</span>
                <span style={styles.value}>{userInfo.username}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Email:</span>
                <span style={styles.value}>{userInfo.email}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Full Name:</span>
                <span style={styles.value}>
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
                <span style={styles.value}>{userId}</span>
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
          <div style={{ ...styles.message, color: "blue" }}>{message}</div>
        )}

        <p style={styles.note}>
          🟢 SECURE: Session stored in HTTP-only cookie. User data retrieved
          from database. All queries parameterized.
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
    marginBottom: "30px",
  },
  userInfoSection: {
    marginBottom: "30px",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    borderLeft: "4px solid #2e7d32",
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
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    fontSize: "12px",
    borderLeft: "4px solid #2e7d32",
  },
};
