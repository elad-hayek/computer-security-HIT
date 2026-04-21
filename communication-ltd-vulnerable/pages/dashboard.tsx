import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// VULNERABLE VERSION - Educational Purpose Only
// This version demonstrates SQL injection and XSS vulnerabilities

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // VULNERABLE: Check auth by attempting to fetch customers
    fetchCustomers();
  }, [router]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();

      if (data.success && data.customers) {
        setCustomers(data.customers);
        setFilteredCustomers(data.customers);
      } else {
        setError("Failed to load customers");
      }
    } catch (err) {
      console.error("Customers fetch error:", err);
      setError("Error fetching customers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchClick = async () => {
    try {
      setIsSearching(true);
      setError(null);
      const query = searchTerm.trim()
        ? `?search=${encodeURIComponent(searchTerm)}`
        : "";
      const response = await fetch(`/api/customers/list${query}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to search customers");
      }

      const data = await response.json();
      if (data.success && data.customers) {
        setFilteredCustomers(data.customers);
      } else {
        setError("Failed to search customers");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Error searching customers");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      setError("First name and last name are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch("/api/customers/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add customer");
      }

      const data = await response.json();
      if (data.success) {
        setMessage("Customer added successfully!");
        setFormData({ firstName: "", lastName: "", email: "" });
        // Refresh customers list
        await fetchCustomers();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.message || "Failed to add customer");
      }
    } catch (err) {
      console.error("Add customer error:", err);
      setError("Error adding customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setMessage("Logging out...");
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
          ⚠ VULNERABLE VERSION - Customer Management
        </p>

        {/* Add Customer Form */}
        <div style={styles.formSection}>
          <h2>Add New Customer</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.labelText}>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleFormChange}
                placeholder="Enter first name"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.labelText}>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleFormChange}
                placeholder="Enter last name"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.labelText}>Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="Enter email"
                style={styles.input}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={styles.submitButton}
            >
              {isSubmitting ? "Adding..." : "Add Customer"}
            </button>
          </form>
          <p style={styles.warning}>
            ⚠️ VULNERABLE: Input is not sanitized. Try: &lt;img src=x
            onerror="alert('XSS')"&gt;
          </p>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <h2>Search Customers</h2>
          <div style={styles.searchContainer}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchClick()}
              placeholder="Search by first or last name..."
              style={styles.searchInput}
            />
            <button
              onClick={handleSearchClick}
              disabled={isSearching}
              style={styles.searchButton}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          {filteredCustomers.length > 0 && (
            <p style={styles.searchInfo}>
              Found {filteredCustomers.length} customer
              {filteredCustomers.length !== 1 ? "s" : ""}
            </p>
          )}
          <p style={styles.warning}>
            ⚠️ VULNERABLE: Server search vulnerable to SQL injection. Try: ' OR
            '1'='1
          </p>
        </div>

        {/* Customers Table */}
        <div style={styles.tableSection}>
          <h2>Customers</h2>
          {filteredCustomers.length === 0 ? (
            <p style={styles.emptyMessage}>
              No customers yet. Add one using the form above.
            </p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.tableCell}>First Name</th>
                    <th style={styles.tableCell}>Last Name</th>
                    <th style={styles.tableCell}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} style={styles.tableRow}>
                      {/* VULNERABLE XSS: Customer names rendered as HTML without escaping */}
                      {/* Attack: firstName = "<img src=x onerror=alert('XSS')>" */}
                      {/* The HTML will execute when page is rendered */}
                      <td
                        style={styles.tableCell}
                        dangerouslySetInnerHTML={{
                          __html: customer.first_name,
                        }}
                      />
                      <td
                        style={styles.tableCell}
                        dangerouslySetInnerHTML={{ __html: customer.last_name }}
                      />
                      <td
                        style={styles.tableCell}
                        dangerouslySetInnerHTML={{
                          __html: customer.email ? customer.email : "-",
                        }}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actionsSection}>
          <Link href="/change-password" style={styles.linkButton}>
            <button style={styles.changePasswordButton}>
              🔐 Change Password
            </button>
          </Link>
          <button style={styles.logoutButton} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        {message && (
          <div style={{ ...styles.message, color: "blue" }}>
            {/* VULNERABLE: Message not sanitized - could contain XSS */}
            {message}
          </div>
        )}

        {error && (
          <div style={{ ...styles.message, color: "red" }}>{error}</div>
        )}

        <p style={styles.note}>
          🔴 VULNERABLE: Database queries use string concatenation (SQL
          injection). Customer names rendered directly as HTML without escaping
          (stored XSS). All user input is trusted.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex" as const,
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    maxWidth: "900px",
    width: "100%",
  },
  vulnerable: {
    color: "#d32f2f",
    fontWeight: "bold" as const,
    marginBottom: "30px",
  },
  formSection: {
    marginBottom: "40px",
    padding: "20px",
    backgroundColor: "#fff3f3",
    borderRadius: "4px",
    borderLeft: "4px solid #d32f2f",
  },
  form: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "15px",
  },
  formGroup: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "5px",
  },
  labelText: {
    fontWeight: "bold" as const,
    color: "#333",
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  submitButton: {
    padding: "12px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold" as const,
  },
  warning: {
    marginTop: "10px",
    color: "#d32f2f",
    fontSize: "12px",
    fontStyle: "italic" as const,
  },
  searchSection: {
    marginBottom: "40px",
    padding: "20px",
    backgroundColor: "#fff3f3",
    borderRadius: "4px",
    borderLeft: "4px solid #d32f2f",
  },
  searchInput: {
    flex: 1,
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    boxSizing: "border-box" as const,
  },
  searchContainer: {
    display: "flex" as const,
    gap: "10px",
    marginBottom: "10px",
  },
  searchButton: {
    padding: "12px 24px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer" as const,
    fontSize: "14px",
    fontWeight: "bold" as const,
    whiteSpace: "nowrap" as const,
    transition: "background-color 0.3s" as const,
  },
  searchInfo: {
    margin: "10px 0 0 0",
    color: "#666",
    fontSize: "14px",
  },
  tableSection: {
    marginBottom: "40px",
    padding: "20px",
    backgroundColor: "#fff3f3",
    borderRadius: "4px",
    borderLeft: "4px solid #d32f2f",
  },
  tableContainer: {
    overflowX: "auto" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  tableHeader: {
    backgroundColor: "#fff0f0",
  },
  tableCell: {
    padding: "12px",
    textAlign: "left" as const,
    borderBottom: "1px solid #ddd",
  },
  tableRow: {
    // Note: Hover effect not supported with inline styles
    // Would need CSS module or styled-components for this
  },
  emptyMessage: {
    color: "#999",
    fontStyle: "italic" as const,
    padding: "20px",
  },
  actionsSection: {
    marginBottom: "20px",
    display: "flex" as const,
    gap: "10px",
    flexDirection: "column" as const,
  },
  linkButton: {
    textDecoration: "none",
  },
  changePasswordButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#FF9800",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold" as const,
  },
  logoutButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold" as const,
  },
  message: {
    padding: "15px",
    marginTop: "20px",
    borderRadius: "4px",
    textAlign: "center" as const,
  },
  note: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#ffebee",
    borderLeft: "4px solid #d32f2f",
    color: "#d32f2f",
    fontSize: "14px",
  },
};
