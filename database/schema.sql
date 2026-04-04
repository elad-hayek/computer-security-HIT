-- =============================================
-- Communication_LTD Database Schema
-- SQL Server - Create this in SQL Server Management Studio
-- =============================================

-- Drop database if exists (for clean reinstall)
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'Communication_LTD')
    DROP DATABASE Communication_LTD;
GO

-- Create database
CREATE DATABASE Communication_LTD;
GO

USE Communication_LTD;
GO

-- =============================================
-- PasswordPolicies Table - Configuration Management
-- =============================================
CREATE TABLE PasswordPolicies (
    id INT PRIMARY KEY IDENTITY(1,1),
    min_length INT NOT NULL DEFAULT 10,
    require_uppercase BIT NOT NULL DEFAULT 1,
    require_lowercase BIT NOT NULL DEFAULT 1,
    require_digits BIT NOT NULL DEFAULT 1,
    require_special_chars BIT NOT NULL DEFAULT 1,
    history_count INT NOT NULL DEFAULT 3,
    max_login_attempts INT NOT NULL DEFAULT 3,
    dictionary_enabled BIT NOT NULL DEFAULT 0,
    created_date DATETIME NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME NOT NULL DEFAULT GETDATE()
);

-- Insert default password policy
INSERT INTO PasswordPolicies (min_length, require_uppercase, require_lowercase, require_digits, require_special_chars, history_count, max_login_attempts)
VALUES (10, 1, 1, 1, 1, 3, 3);

GO

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
CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(250) NOT NULL UNIQUE,
    email NVARCHAR(250) NOT NULL UNIQUE,
    password_hash NVARCHAR(MAX) NOT NULL,
    salt NVARCHAR(128) NOT NULL,
    password_changed_date DATETIME NULL,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME NULL,
    password_history NVARCHAR(MAX),  -- JSON array of previous password hashes
    created_date DATETIME NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME NOT NULL DEFAULT GETDATE()
);

GO

-- =============================================
-- Customers Table - Customer/Sector Information
-- Why these fields:
-- - user_id (FK): Links customer to user who added them
-- - first_name, last_name: Customer identification
-- - phone, email: Contact information
-- - sector: Market segment (e.g., Healthcare, Finance, Education)
-- - subscription_package: Browsing package tier (Standard, Premium, Enterprise)
-- =============================================
CREATE TABLE Customers (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
    first_name NVARCHAR(250) NOT NULL,
    last_name NVARCHAR(250) NOT NULL,
    phone NVARCHAR(20),
    email NVARCHAR(250),
    sector NVARCHAR(250),
    subscription_package NVARCHAR(50),  -- e.g., 'Standard', 'Premium', 'Enterprise'
    created_date DATETIME NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME NOT NULL DEFAULT GETDATE()
);

GO

-- =============================================
-- PasswordResetTokens Table - Forgot Password Flow
-- Why these fields:
-- - token_hash (SHA-1): Hashed token stored in DB (never store plain tokens)
-- - user_id: Which user requested password reset
-- - expiry_date: Tokens valid for 1 hour only
-- - used: Mark token as consumed to prevent reuse
-- =============================================
CREATE TABLE PasswordResetTokens (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
    token_hash NVARCHAR(MAX) NOT NULL,
    expiry_date DATETIME NOT NULL,
    used BIT DEFAULT 0,
    created_date DATETIME NOT NULL DEFAULT GETDATE()
);

GO

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IDX_Users_Username ON Users(username);
CREATE INDEX IDX_Users_Email ON Users(email);
CREATE INDEX IDX_Customers_UserId ON Customers(user_id);
CREATE INDEX IDX_PasswordResetTokens_UserId ON PasswordResetTokens(user_id);
CREATE INDEX IDX_PasswordResetTokens_TokenHash ON PasswordResetTokens(token_hash);

GO

-- =============================================
-- Sample Data (Optional - Remove for production)
-- =============================================
-- Example user: username=testuser, password (plain for reference only): TestPass123!
-- In real scenario, password_hash would contain HMAC-SHA256 hash + salt
INSERT INTO Users (username, email, password_hash, salt, created_date)
VALUES (
    'testuser',
    'testuser@communication-ltd.com',
    '-- THIS WOULD BE HASHED --',
    'random-salt-value',
    GETDATE()
);

GO

-- =============================================
-- Setup Instructions Success
-- =============================================
/**
SUCCESS: Database schema created successfully!

Connection String for Next.js projects:
======================================
Server=localhost;Database=Communication_LTD;User Id=sa;Password=YOUR_SQL_PASSWORD;Encrypt=true;TrustServerCertificate=true;

Environment Variables for .env.local:
=====================================
DB_SERVER=localhost
DB_DATABASE=Communication_LTD
DB_USER=sa
DB_PASSWORD=YOUR_SQL_PASSWORD
DB_PORT=1433

To verify connection from SSMS:
1. Connect with: Server=localhost, Database=Communication_LTD, Authentication=SQL Server Authentication
2. Run: SELECT * FROM sys.tables;  (Should show 4 tables)
3. Run: SELECT * FROM PasswordPolicies;  (Should show password rules)

Tables created:
- Users (Authentication)
- Customers (Customer management)
- PasswordPolicies (Configuration)
- PasswordResetTokens (Forgot password)
*/
