import { escape as htmlEscape } from "html-escaper";

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  value?: any;
}

// Validate username: 3-50 chars, alphanumeric + underscore
export function validateUsername(username: any): ValidationResult {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Username must not exceed 50 characters" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }

  return { valid: true, error: null, value: trimmed };
}

// Validate email: valid format, max 255 chars
export function validateEmail(email: any): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();
  if (trimmed.length > 255) {
    return { valid: false, error: "Email must not exceed 255 characters" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true, error: null, value: trimmed };
}

// Validate optional email
export function validateEmailOptional(email: any): ValidationResult {
  if (!email) {
    return { valid: true, error: null, value: null };
  }

  return validateEmail(email);
}

// Validate name (firstName, lastName): 1-100 chars, letters/spaces/hyphens, sanitize HTML
export function validateName(name: any, fieldName: string): ValidationResult {
  if (!name || typeof name !== "string") {
    return { valid: false, error: `${fieldName} is required` };
  }

  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (trimmed.length > 100) {
    return {
      valid: false,
      error: `${fieldName} must not exceed 100 characters`,
    };
  }

  // Allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
    };
  }

  // Sanitize HTML before returning
  const sanitized = htmlEscape(trimmed);
  return { valid: true, error: null, value: sanitized };
}

// Validate phone: optional, numbers only, max 20 chars
export function validatePhoneOptional(phone: any): ValidationResult {
  if (!phone) {
    return { valid: true, error: null, value: null };
  }

  if (typeof phone !== "string") {
    return { valid: false, error: "Phone must be a string" };
  }

  const trimmed = phone.trim();
  if (trimmed.length > 20) {
    return {
      valid: false,
      error: "Phone number must not exceed 20 characters",
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: "Phone number can only contain digits" };
  }

  return { valid: true, error: null, value: trimmed };
}

// Validate search term: optional, max 200 chars, alphanumeric/spaces
export function validateSearchTerm(search: any): ValidationResult {
  if (!search) {
    return { valid: true, error: null, value: "" };
  }

  if (typeof search !== "string") {
    return { valid: false, error: "Search term must be a string" };
  }

  const trimmed = search.trim();
  if (trimmed.length > 200) {
    return {
      valid: false,
      error: "Search term must not exceed 200 characters",
    };
  }

  return { valid: true, error: null, value: trimmed };
}

// Validate password basic constraints: 8-128 chars
export function validatePasswordLength(password: any): ValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password must not exceed 128 characters" };
  }

  return { valid: true, error: null, value: password };
}

// Sanitize string: trim and escape HTML
export function sanitizeString(value: any): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  return htmlEscape(value.trim());
}

// Generic string field validator
export function validateStringField(
  value: any,
  fieldName: string,
  minLength: number,
  maxLength: number,
  pattern?: RegExp,
): ValidationResult {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${fieldName} is required` };
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  if (pattern && !pattern.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }

  return { valid: true, error: null, value: trimmed };
}
