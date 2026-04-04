# Communication_LTD Cybersecurity Project

## 🎯 Quick Start

This project demonstrates **secure vs. vulnerable** web development for a telecom company.

### Two Versions:

- **[communication-ltd-vulnerable](./communication-ltd-vulnerable)** (Port 3000) – Shows vulnerabilities
- **[communication-ltd-secure](./communication-ltd-secure)** (Port 3001) – Shows best practices

### Features Implemented:

✅ User Registration (with password validation)  
✅ User Login (with rate limiting)  
✅ Change Password (with history check)  
✅ Add Customer (demonstrates Stored XSS)  
✅ Forgot Password (with secure token generation)

### Security Topics Covered:

🔐 SQL Injection attacks & prevention  
🔐 Stored XSS attacks & prevention  
🔐 Password hashing with bcryptjs  
🔐 Rate limiting & account lockout  
🔐 Parameterized queries  
🔐 Input validation & error handling

---

## 📚 Documentation

- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** – Comprehensive guide (read this first!)
- **[database/SETUP_INSTRUCTIONS.md](./database/SETUP_INSTRUCTIONS.md)** – Database setup guide
- **[database/schema.sql](./database/schema.sql)** – SQL Server schema

---

## 🚀 Setup (5 minutes)

### 1. Create Database

```bash
# In SQL Server Management Studio or Azure Data Studio:
# File → Open → database/schema.sql
# Execute the script
```

### 2. Update Environment Variables

Edit both `.env.local` files and update:

```env
DB_PASSWORD=YourActualSQLPassword  # Change this!
```

### 3. Install & Run

```bash
# Terminal 1 - Vulnerable Version
cd communication-ltd-vulnerable
npm install
npm run dev  # http://localhost:3000

# Terminal 2 - Secure Version
cd communication-ltd-secure
npm install
npm run dev  # http://localhost:3001
```

---

## 🧪 Test Attacks

### SQL Injection (Login)

**URL:** `http://localhost:3000/api/auth/login` (vulnerable)

```json
{
  "username": "admin' --",
  "password": "anything"
}
```

**Result:** Logs in without correct password! ❌

Try in secure version - BLOCKED ✅

### Stored XSS (Add Customer)

**URL:** `http://localhost:3000/api/customers/add`

```json
{
  "firstName": "<img src=x onerror='alert(\"XSS\")'>",
  "lastName": "Test",
  "email": "test@example.com",
  "phone": "123456789",
  "sector": "Finance",
  "subscriptionPackage": "Premium"
}
```

**Result (Vulnerable):** Alert pops up when viewing customers ❌

**Result (Secure):** Displayed as literal text ✅

---

## 📁 Project Structure

```
communication-ltd-vulnerable/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register.ts      (Plain-text passwords)
│   │   │   ├── login.ts         (SQL Injection possible)
│   │   │   ├── forgot-password.ts
│   │   │   ├── reset-password.ts
│   │   │   └── change-password.ts
│   │   └── customers/
│   │       ├── add.ts           (Stored XSS demo)
│   │       └── get.ts
│   ├── register.tsx
│   └── api/hello.ts
├── lib/
│   ├── db.ts                    (Direct queries - vulnerable)
│   └── auth.ts                  (No hashing - vulnerable)
├── .env.local                   (DB credentials)
└── package.json

communication-ltd-secure/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register.ts      (Bcryptjs hashing)
│   │   │   ├── login.ts         (Parameterized queries)
│   │   │   ├── forgot-password.ts
│   │   │   ├── reset-password.ts
│   │   │   └── change-password.ts
│   │   └── customers/
│   │       ├── add.ts           (Parameterized + HTML escaping)
│   │       └── get.ts
│   ├── register.tsx
│   └── api/hello.ts
├── lib/
│   ├── db.ts                    (Parameterized queries)
│   └── auth.ts                  (Bcryptjs hashing)
├── .env.local                   (DB credentials)
└── package.json

database/
├── schema.sql                   (Create database tables)
└── SETUP_INSTRUCTIONS.md        (Detailed setup guide)

PROJECT_DOCUMENTATION.md         (This document!)
```

---

## 🔑 Key Differences

### Registration Endpoint

```typescript
// VULNERABLE
const passwordHash = password; // Plain text!
const query = `INSERT INTO Users ... VALUES ('${username}', ... '${passwordHash}')`;

// SECURE
const passwordHash = await bcryptjs.hash(password, 12);
request.input("username", sql.NVarChar, username);
await request.query(
  `INSERT INTO Users ... VALUES (@username, ..., @password_hash)`,
);
```

### Login Endpoint

```typescript
// VULNERABLE
const query = `SELECT * FROM Users WHERE username = '${username}' AND password_hash = '${password}'`;
// SQL Injection: username = "admin' --"

// SECURE
request.input("username", sql.NVarChar, username);
const user = await request.query(
  `SELECT * FROM Users WHERE username = @username`,
);
const match = await bcryptjs.compare(password, user.password_hash);
if (!match) {
  login_attempts++;
  if (login_attempts >= 3) accountLocked = true;
}
```

### Add Customer (XSS)

```typescript
// VULNERABLE - Frontend
<h2>{customer.firstName}</h2>
// If firstName = "<img src=x onerror='alert(1)'>" → Script executes!

// SECURE - Frontend (React auto-escapes)
<h2>{customer.firstName}</h2>
// HTML characters automatically escaped → Displayed as text
```

---

## 🛡️ Security Checklist

- ✅ Passwords hashed with bcryptjs (12 rounds)
- ✅ SQL injection prevented with parameterized queries
- ✅ XSS prevented with output encoding
- ✅ Rate limiting (3 failed attempts → 15 min lockout)
- ✅ Password history (can't reuse last 3)
- ✅ Old password verification (for password changes)
- ✅ Generic error messages (no info leakage)
- ✅ Token hashing (SHA-1 for reset tokens)
- ✅ Input validation (email, password complexity)
- ✅ Configuration management (.env.local)

---

## 📊 Comparison Table

| Feature          | Vulnerable       | Secure               |
| ---------------- | ---------------- | -------------------- |
| Password Storage | Plain text ❌    | Bcryptjs ✅          |
| SQL Queries      | String concat ❌ | Parameterized ✅     |
| XSS Protection   | None ❌          | HTML escaping ✅     |
| Rate Limiting    | No ❌            | 3 attempts/15 min ✅ |
| Password History | No ❌            | Last 3 hashes ✅     |
| Error Messages   | Detailed ❌      | Generic ✅           |

---

## 🎓 Learning Outcomes

After this project, you'll understand:

1. How SQL Injection works and how parameterized queries prevent it
2. Why plain-text password storage is dangerous
3. How bcryptjs makes password cracking impractical
4. What Stored XSS is and how HTML encoding prevents it
5. Why rate limiting is essential
6. The importance of secure token generation
7. Best practices for error handling and input validation
8. Configuration management for sensitive data

---

## 🐛 Troubleshooting

| Issue                        | Solution                                              |
| ---------------------------- | ----------------------------------------------------- |
| "Cannot connect to database" | Verify SQL Server running, check DB_PASSWORD          |
| "Port 3000 already in use"   | Kill process: `netstat -ano \| findstr :3000`         |
| "Module not found"           | Run `npm install` in project directory                |
| "SQL Injection doesn't work" | Check if you're using vulnerable version on port 3000 |
| ".env.local not loading"     | Restart Next.js server after editing                  |

---

## 📖 Further Reading

- **OWASP Top 10:** https://owasp.org/Top10/
- **OWASP SQL Injection:** https://owasp.org/www-community/attacks/sql_injection
- **OWASP XSS:** https://owasp.org/www-community/attacks/xss/
- **Bcryptjs Docs:** https://github.com/dcodeIO/bcrypt.js

---

## 📝 Notes

- **Vulnerable version** is for educational purposes ONLY
- Tests are designed to safely demonstrate attacks
- NEVER use vulnerable patterns in production!
- Always use parameterized queries and strong hashing
- This project fulfills HIT Cybersecurity Course Final Project requirements

---

**Created:** April 2026  
**For:** HIT Cybersecurity Course  
**Author:** GitHub Copilot (Haiku 4.5)

---

**Happy learning and stay secure! 🔐**
