-- =============================================
-- Communication_LTD Database Schema (SQLite)
-- For local development and testing
-- =============================================

-- =============================================
-- Users Table - Authentication & User Management
-- Why these fields and constraints:
-- - username UNIQUE: Prevents duplicate accounts per business rule
-- - email UNIQUE: Unique email per user
-- - password_hash: Store hashed password (NEVER plain text)
-- - salt: Unique salt per user for hashing calculations
-- - first_name, last_name, phone: User contact information
-- - login_attempts: Track failed logins for rate limiting
-- - locked_until: Timestamp for account lockout after N failed attempts
-- - password_changed_date: Track when password was last changed
-- =============================================
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    password_changed_date DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PasswordHistory Table - Track Password Changes
-- Why these fields:
-- - user_id (FK): Links password history to user
-- - password_hash: Historical password hash (prevent reuse)
-- - created_date: When this password was set
-- Used to enforce "cannot reuse last N passwords" policy
-- =============================================
CREATE TABLE IF NOT EXISTS PasswordHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
CREATE INDEX IF NOT EXISTS IDX_PasswordHistory_UserId ON PasswordHistory(user_id);
CREATE INDEX IF NOT EXISTS IDX_PasswordHistory_CreatedDate ON PasswordHistory(created_date);
CREATE INDEX IF NOT EXISTS IDX_PasswordResetTokens_UserId ON PasswordResetTokens(user_id);
CREATE INDEX IF NOT EXISTS IDX_PasswordResetTokens_TokenHash ON PasswordResetTokens(token_hash);

-- =============================================
-- Sample Data (Optional - Remove for production)
-- =============================================
-- Example user: username=testuser, password (plain for reference only): TestPass123
-- In real scenario, password_hash would contain bcryptjs hash
INSERT OR IGNORE INTO Users (id, username, email, first_name, last_name, phone, password_hash, salt, created_date)
VALUES (
    1,
    'testuser',
    'testuser@communication-ltd.com',
    'Test',
    'User',
    '+1234567890',
    '$2b$12$CuSprHMc3tpnjTB8pfhjmuSNggTR/28AqTyQsix3NbM61nCtFzQuy',
    'CuSprHMc3tpnjTB8pfhjmu',
    CURRENT_TIMESTAMP
);

-- =============================================
-- Setup Complete
-- =============================================
-- SQLite database initialized successfully!
-- 
-- Tables created:
-- - Users (Authentication)
-- - Customers (Customer management)
-- - PasswordResetTokens (Forgot password)
--
-- To inspect the database, use:
-- sqlite3 data/communication_ltd.db ".tables"
-- sqlite3 data/communication_ltd.db ".schema Users"
