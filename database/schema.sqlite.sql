-- =============================================
-- Communication_LTD Database Schema (SQLite)
-- For local development and testing
-- =============================================

-- =============================================
-- PasswordPolicies Table - Configuration Management
-- =============================================
CREATE TABLE IF NOT EXISTS PasswordPolicies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    min_length INTEGER NOT NULL DEFAULT 10,
    require_uppercase INTEGER NOT NULL DEFAULT 1,
    require_lowercase INTEGER NOT NULL DEFAULT 1,
    require_digits INTEGER NOT NULL DEFAULT 1,
    require_special_chars INTEGER NOT NULL DEFAULT 1,
    history_count INTEGER NOT NULL DEFAULT 3,
    max_login_attempts INTEGER NOT NULL DEFAULT 3,
    dictionary_enabled INTEGER NOT NULL DEFAULT 0,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default password policy
INSERT OR IGNORE INTO PasswordPolicies (id, min_length, require_uppercase, require_lowercase, require_digits, require_special_chars, history_count, max_login_attempts)
VALUES (1, 10, 1, 1, 1, 1, 3, 3);

-- =============================================
-- Users Table - Authentication & User Management
-- Why these fields and constraints:
-- - username UNIQUE: Prevents duplicate accounts per business rule
-- - password_hash: Store hashed password (NEVER plain text)
-- - salt: Unique salt per user for HMAC calculations
-- - password_history (JSON): Track past 3 hashes to prevent reuse
-- - login_attempts: Track failed logins for rate limiting
-- - locked_until: Timestamp for account lockout after 3 failed attempts
-- =============================================
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    password_changed_date DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    password_history TEXT,  -- JSON array of previous password hashes
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Customers Table - Customer/Sector Information
-- Why these fields:
-- - user_id (FK): Links customer to user who added them
-- - first_name, last_name: Customer identification
-- - phone, email: Contact information
-- - sector: Market segment (e.g., Healthcare, Finance, Education)
-- - subscription_package: Browsing package tier (Standard, Premium, Enterprise)
-- =============================================
CREATE TABLE IF NOT EXISTS Customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    sector TEXT,
    subscription_package TEXT,  -- e.g., 'Standard', 'Premium', 'Enterprise'
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- =============================================
-- PasswordResetTokens Table - Forgot Password Flow
-- Why these fields:
-- - token_hash (SHA-1): Hashed token stored in DB (never store plain tokens)
-- - user_id: Which user requested password reset
-- - expiry_date: Tokens valid for 1 hour only
-- - used: Mark token as consumed to prevent reuse
-- =============================================
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expiry_date DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS IDX_Users_Username ON Users(username);
CREATE INDEX IF NOT EXISTS IDX_Users_Email ON Users(email);
CREATE INDEX IF NOT EXISTS IDX_Customers_UserId ON Customers(user_id);
CREATE INDEX IF NOT EXISTS IDX_PasswordResetTokens_UserId ON PasswordResetTokens(user_id);
CREATE INDEX IF NOT EXISTS IDX_PasswordResetTokens_TokenHash ON PasswordResetTokens(token_hash);

-- =============================================
-- Sample Data (Optional - Remove for production)
-- =============================================
-- Example user: username=testuser, password (plain for reference only): TestPass123!
-- In real scenario, password_hash would contain HMAC-SHA256 hash + salt
INSERT OR IGNORE INTO Users (id, username, email, password_hash, salt, created_date)
VALUES (
    1,
    'testuser',
    'testuser@communication-ltd.com',
    '-- THIS WOULD BE HASHED --',
    'random-salt-value',
    CURRENT_TIMESTAMP
);

-- =============================================
-- Setup Complete
-- =============================================
-- SQLite database initialized successfully!
-- 
-- Tables created:
-- - PasswordPolicies (Configuration)
-- - Users (Authentication)
-- - Customers (Customer management)
-- - PasswordResetTokens (Forgot password)
--
-- To inspect the database, use:
-- sqlite3 data/communication_ltd.db ".tables"
-- sqlite3 data/communication_ltd.db ".schema Users"
