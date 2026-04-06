/**
 * Database Initialization Script for SQLite
 * This script will run with Node so it has all the necessary packages built in.
 *
 * Usage:
 * - As npm script: npm run db:init
 * - Direct: npx ts-node database/init-db.ts
 */

import Database from "sqlite";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH || "./data/communication_ltd.db"; // Default path for SQLite database file
const SCHEMA_FILE = path.join(__dirname, "schema.sqlite.sql"); // SQL file containing CREATE TABLE and initial INSERT statements

async function initializeDatabase() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created directory: ${dataDir}`);
    }

    // Check if database already initialized (check for Users table)
    let db: any;
    const dbExists = fs.existsSync(DB_PATH);

    if (dbExists) {
      db = await Database.open(DB_PATH);
      try {
        await db.get("SELECT 1 FROM Users LIMIT 1");
        console.log("Database already initialized");
        await db.close();
        return;
      } catch (e) {
        // Table doesn't exist, proceed with initialization
        console.log("Database exists but schema not initialized - continuing with setup...");
      }
    }

    // Open/create database connection
    db = await Database.open(DB_PATH);
    console.log(`Opened database: ${DB_PATH}`);

    // Read schema file
    const schema = fs.readFileSync(SCHEMA_FILE, "utf-8");
    console.log("Loaded schema file");

    // Execute schema (split by statements and execute each)
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      try {
        await db.run(statement);
      } catch (error: any) {
        // Some statements might fail (INSERT OR IGNORE, CREATE TABLE IF NOT EXISTS)
        // but that's okay - we continue
        if (!error.message.includes("UNIQUE constraint failed")) {
          console.log(`  i Statement: ${statement.substring(0, 50)}...`);
        }
      }
    }

    await db.close();
    console.log("Database initialized successfully!");
    console.log(`Database location: ${DB_PATH}`);
    console.log("\n Setup complete! You can now run: npm run dev\n");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
