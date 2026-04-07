import fs from "fs";
import path from "path";

export interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecialChars: boolean;
  passwordHistory: number;
  maxLoginAttempts: number;
  dictionaryCheckEnabled: boolean;
  dictionaryFilePath: string;
}

const DEFAULT_CONFIG: PasswordConfig = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireDigits: true,
  requireSpecialChars: true,
  passwordHistory: 3,
  maxLoginAttempts: 3,
  dictionaryCheckEnabled: true,
  dictionaryFilePath: "../wordlists/common-passwords.txt",
};

let cachedConfig: PasswordConfig | null = null;
let weakPasswords: Set<string> = new Set();
let fileWatcher: fs.FSWatcher | null = null;

/**
 * Load password configuration from JSON file
 * Falls back to defaults if file not found
 */
export function loadPasswordConfig(): PasswordConfig {
  try {
    const configPath = path.join(__dirname, "../password.config.json");
    const configData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configData) as PasswordConfig;
    cachedConfig = config;

    // Load dictionary file if enabled
    if (config.dictionaryCheckEnabled) {
      loadWeakPasswordsList(config.dictionaryFilePath);
    }

    // Set up file watcher for hot reload
    if (!fileWatcher) {
      fileWatcher = fs.watch(configPath, () => {
        try {
          const newConfigData = fs.readFileSync(configPath, "utf-8");
          cachedConfig = JSON.parse(newConfigData) as PasswordConfig;
          console.log("Password config reloaded from file");
        } catch (error) {
          console.error("Failed to reload password config:", error);
        }
      });
    }

    return config;
  } catch (error) {
    console.warn("Failed to load password config, using defaults:", error);
    cachedConfig = { ...DEFAULT_CONFIG };
    return cachedConfig;
  }
}

/**
 * Get cached password configuration
 */
export function getPasswordConfig(): PasswordConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  return loadPasswordConfig();
}

/**
 * Load weak passwords list from dictionary file
 */
function loadWeakPasswordsList(dictionaryPath: string): void {
  try {
    const fullPath = path.join(__dirname, dictionaryPath);
    const content = fs.readFileSync(fullPath, "utf-8");
    const passwords = content
      .split("\n")
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 0);
    weakPasswords = new Set(passwords);
    console.log(
      `Loaded ${weakPasswords.size} weak passwords from dictionary`,
    );
  } catch (error) {
    console.warn("Failed to load weak passwords dictionary:", error);
  }
}

/**
 * Check if a password is in the weak passwords list
 */
export function isWeakPassword(password: string): boolean {
  if (weakPasswords.size === 0) {
    return false;
  }
  return weakPasswords.has(password.toLowerCase());
}

/**
 * Close config file watcher for cleanup
 */
export function closeConfigWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}
