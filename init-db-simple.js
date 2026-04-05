// Simple database initialization script using javascript
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const DB_PATH = "./data/communication_ltd.db";
const SCHEMA_FILE = path.join(__dirname, "./database/schema.sqlite.sql");

// Create data directory if it doesn't exist
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✓ Created directory: ${dataDir}`);
}

// Read schema file
const schema = fs.readFileSync(SCHEMA_FILE, "utf-8");
console.log("✓ Loaded schema file");

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("✗ Database connection failed:", err);
    process.exit(1);
  }
  console.log(`✓ Opened database: ${DB_PATH}`);

  // Execute schema statements
  const statements = schema
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

  let count = 0;
  const executeStatement = (stmt) => {
    db.run(stmt, (err) => {
      if (err && !err.message.includes("UNIQUE constraint failed")) {
        console.log(`  ⚠ ${err.message}`);
      }
      count++;
      if (count < statements.length) {
        executeStatement(statements[count]);
      } else {
        db.close((err) => {
          if (err) {
            console.error("✗ Database close failed:", err);
            process.exit(1);
          }
          console.log("✓ Database initialized successfully!");
          console.log(`📊 Database location: ${DB_PATH}`);
          console.log("\n🎉 Setup complete! You can now run: npm run dev\n");
        });
      }
    });
  };

  if (statements.length > 0) {
    executeStatement(statements[0]);
  } else {
    db.close();
  }
});
