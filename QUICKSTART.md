# Quick Start Guide for Developers

## ⚡ 5-Minute Setup

### Step 1: Initialize Database (1 min)

The database uses **SQLite**, a local file-based database with zero setup!

```bash
# From the root directory:
npm run db:init

# This creates the database file at data/communication_ltd.db
```

### Step 2: Start Projects (2 min)

**Terminal 1:**

```bash
cd communication-ltd-vulnerable
npm install  # First time only
npm run dev  # http://localhost:3000
```

**Terminal 2:**

```bash
cd communication-ltd-secure
npm install  # First time only
npm run dev  # http://localhost:3001
```

### Step 3: Verify Setup (1 min)

Both applications should start without errors. You'll see:

```
✓ Database connected successfully
```

in the console for each project.

---

## 🔄 Resetting the Database

If you need a fresh database, run:

```bash
npm run db:reset
```

This deletes the existing database and recreates it with default data.

---

## 🧪 Testing Attacks (Optional)

### Quick Test 1: SQL Injection

```bash
# In Postman or curl:
POST http://localhost:3000/api/auth/register
{
  "username": "test'; DROP TABLE Users; --",
  "email": "test@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

**Vulnerable:** May show SQL errors or unexpected behavior  
**Secure:** Properly escaped, adds user normally

### Quick Test 2: Stored XSS

```bash
POST http://localhost:3000/api/customers/add
{
  "userId": 1,
  "firstName": "<img src=x onerror='alert(\"XSS\")'>",
  "lastName": "Test",
  "email": "cust@example.com",
  "phone": "1234567890",
  "sector": "Finance",
  "subscriptionPackage": "Premium"
}
```

**Vulnerable:** Alert pops up when viewing customers  
**Secure:** Displayed as literal text `<img src=...>`

---

## 📂 File Structure Overview

```
communication-ltd-vulnerable/        ← DON'T USE IN PRODUCTION
├── lib/db.ts                       (Vulnerable: direct SQL queries)
├── lib/auth.ts                     (Vulnerable: no password hashing)
├── pages/api/auth/register.ts      (Vulnerable: SQL injection)
└── pages/api/customers/add.ts      (Vulnerable: Stored XSS)

communication-ltd-secure/           ← USE THIS FOR PRODUCTION
├── lib/db.ts                       (Secure: parameterized queries)
├── lib/auth.ts                     (Secure: bcryptjs hashing)
├── pages/api/auth/register.ts      (Secure: parameterized queries)
└── pages/api/customers/add.ts      (Secure: HTML escaping)

database/
├── schema.sqlite.sql               (SQLite schema for tables)
├── init-db.ts                      (Database initialization script)
├── schema.sql                      (Legacy MSSQL schema - not used)
└── SETUP_INSTRUCTIONS.md           (Detailed database guide)

data/
└── communication_ltd.db            (Your local SQLite database - created after npm run db:init)

PROJECT_DOCUMENTATION.md            (Read this for details!)
```

---

## 💡 About SQLite

This project uses **SQLite** for local development:

✅ **Zero server setup** - Just a file on your computer  
✅ **Perfect for learning** - No installation required  
✅ **Fast for development** - Great performance for educational use  
✅ **Portable** - Share your `data/communication_ltd.db` file with teammates

For production, consider PostgreSQL, MySQL, or a managed database service.

```

---

## 🔑 Key Endpoints

### Both Versions

| Endpoint                    | Method | Purpose                   |
| --------------------------- | ------ | ------------------------- |
| `/api/auth/register`        | POST   | Register new user         |
| `/api/auth/login`           | POST   | User login                |
| `/api/auth/change-password` | POST   | Change password           |
| `/api/auth/forgot-password` | POST   | Request reset token       |
| `/api/auth/reset-password`  | POST   | Reset password with token |
| `/api/customers/add`        | POST   | Add new customer          |
| `/api/customers/get`        | GET    | Get customers for user    |

### Authentication Flow

```

1. Register → Create account
2. Login → Get session
3. Add Customer → Store data
4. Change Password → Update password
5. Forgot Password → Generate reset token
6. Reset Password → Use token to change password

````

---

## ✅ Mandatory Test Cases

Complete these before submitting:

- [ ] **Register:** Create user with valid password
- [ ] **Login:** Log in successfully
- [ ] **Login Rate Limit:** Try 3 failed logins → account locked
- [ ] **Password History:** Try to reuse same password → rejected (secure only)
- [ ] **SQL Injection:** Try `admin' --` in vulnerable version
- [ ] **XSS Test:** Try `<img src=x onerror='alert(1)'>` in vulnerable version
- [ ] **XSS Protected:** Same payload displays as text in secure version
- [ ] **Forgot Password:** Generate reset token (check console)
- [ ] **Change Password:** Update password successfully
- [ ] **Invalid Password:** Reject password not meeting policy

---

## 🐛 Common Issues & Fixes

### Issue: `Cannot connect to server`

**Fix:**

```bash
# Ensure SQL Server is running
# Services → SQL Server (MSSQLSERVER) → right-click → Start

# Edit .env.local and check:
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=CorrectPassword
````

### Issue: `Port 3000 already in use`

**Fix:**

```powershell
# Kill the process
netstat -ano | findstr :3000
taskkill /PID <ProcessID> /F
```

### Issue: `Module not found: mssql`

**Fix:**

```bash
npm install
npm install mssql bcryptjs html-escaper
```

### Issue: `.env.local` changes not reflecting

**Fix:**

```bash
# Stop the server (Ctrl+C)
npm run dev  # Restart
```

---

## 📊 Metrics to Verify

### Vulnerable Version

- ✅ Passwords stored as plain text in DB
- ✅ SQL injection successful (query manipulation)
- ✅ XSS payload executes in browser
- ✅ No rate limiting (unlimited login attempts)
- ✅ No password history check (can reuse)

### Secure Version

- ✅ Passwords hashed with bcryptjs
- ✅ SQL injection blocked (parameterized queries)
- ✅ XSS payload rendered as text (escaped)
- ✅ Rate limiting active (3 attempts/15 min)
- ✅ Password history enforced (last 3)
- ✅ Account lockout after failed attempts
- ✅ Generic error messages (no info leakage)

---

## 🎯 What You'll Learn

1. **SQL Injection** - How string concatenation enables database attacks
2. **Parameterized Queries** - How to safely pass user input to database
3. **Password Hashing** - Why bcryptjs is better than MD5/SHA
4. **Stored XSS** - How un-escaped data causes JavaScript execution
5. **Rate Limiting** - How to prevent brute force attacks
6. **Defense in Depth** - Multiple security layers protect better than one

---

## 📚 Next Steps

1. Run both projects successfully
2. Test all vulnerabilities listed in testing section
3. Compare vulnerable vs. secure code
4. Read PROJECT_DOCUMENTATION.md for detailed explanations
5. Study the comments in lib/auth.ts and lib/db.ts
6. Check out the API files to see inline security explanations

---

## 💾 Important Reminders

- Never commit `.env.local` (database passwords!)
- Always use secure version in production
- Test vulnerabilities in isolated environment only
- Document your findings
- Compare code side-by-side (vulnerable vs. secure)

---

## 🆘 Need Help?

Check:

1. PROJECT_DOCUMENTATION.md - Most questions answered here
2. database/SETUP_INSTRUCTIONS.md - DB specific issues
3. Check server console output for error messages
4. Look at comments in lib/auth.ts and lib/db.ts
5. Review API response messages (they hint at issues)

---

**Created:** April 2026  
**For:** HIT Cybersecurity Course | **By:** GitHub Copilot

**Happy hacking! 🔐** (Educational style of course)
