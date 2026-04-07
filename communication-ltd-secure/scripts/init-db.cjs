/**
 * Database Initialization Script for SQLite
 * This script will run with Node so it has all the necessary packages built in.
 *
 * Usage:
 * - As npm script: npm run db:init
 * - Direct: node scripts/init-db.cjs
 */

const sqlite3 = require("sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || "./data/communication_ltd.db"; // Default path for SQLite database file
const SCHEMA_FILE = path.join(__dirname, "../../database/schema.sqlite.sql"); // SQL file containing CREATE TABLE and initial INSERT statements

console.log(`Initializing database at: ${DB_PATH}`);
console.log(`Using schema file: ${SCHEMA_FILE}`);

//Helper functions to promisify sqlite3 callback-based API
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function initializeDatabase() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created directory: ${dataDir}`);
    }

    // Check if database already initialized (check for Users table)
    let db;
    const dbExists = fs.existsSync(DB_PATH);

    if (dbExists) {
      db = await openDatabase(DB_PATH);
      try {
        await getAsync(db, "SELECT 1 FROM Users LIMIT 1");
        console.log("Database already initialized");
        await closeDatabase(db);
        return;
      } catch (e) {
        // Table doesn't exist, proceed with initialization
        console.log(
          "Database exists but schema not initialized - continuing with setup...",
        );
      }
    }

    // Open/create database connection
    db = await openDatabase(DB_PATH);
    console.log(`Opened database: ${DB_PATH}`);

    // Read schema file
    const schema = fs.readFileSync(SCHEMA_FILE, "utf-8");
    console.log("Loaded schema file");

    // Remove SQL comments before parsing statements
    let cleanSchema = schema
      .split("\n")
      .map((line) => {
        // Remove -- style comments
        const commentIndex = line.indexOf("--");
        return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      })
      .join("\n");

    // Execute schema (split by statements and execute each)
    const statements = cleanSchema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (const statement of statements) {
      try {
        await runAsync(db, statement);
        console.log(`Executed: ${statement.substring(0, 60)}...`);
      } catch (error) {
        console.error(
          `Error executing statement: ${statement.substring(0, 80)}...`,
        );
        console.error(`  Error details: ${error.message}`);
      }
    }

    await closeDatabase(db);
    console.log("Database initialized successfully!");
    console.log(`Database location: ${DB_PATH}`);
    console.log("\n Setup complete! You can now run: npm run dev\n");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

//Run initialization
initializeDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
