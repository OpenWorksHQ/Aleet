/**
 * lib/validators/ssn.ts
 * ---------------------------------------------------------------------------
 * Frontend SSN validator. Mirrors the backend validator at
 * Aleet-backend-c1/src/utils/ssnValidator.js — keep them in sync.
 *
 * Beyond shape, this enforces real SSA rules so we fail fast in the UI
 * instead of waiting for the backend to reject after a full multipart upload:
 *   - area cannot be 000, 666, or 9XX (ITIN range)
 *   - group cannot be 00
 *   - serial cannot be 0000
 *   - reject all-same-digit placeholders (111-11-1111 etc.)
 *   - reject documented known-invalid numbers (Woolworth wallet, etc.)
 *
 * Returns { valid: true } on success, or { valid: false, error: string }.
 * Error messages are intentionally generic for non-format failures.
 * ---------------------------------------------------------------------------
 */

export const SSN_SHAPE = /^\d{3}-\d{2}-\d{4}$/;

// Documented misused SSNs published by the SSA as invalid for issuance.
const KNOWN_INVALID = new Set<string>([
  "078-05-1120", // "Woolworth wallet" SSN, widely misused in the 1930s
  "219-09-9999", // appeared in a 1962 ad and was issued to multiple people
  "123-45-6789", // most common example value
]);

export type SsnValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateSSN(ssn: string | null | undefined): SsnValidationResult {
  if (!ssn || typeof ssn !== "string") {
    return { valid: false, error: "SSN is required" };
  }

  const trimmed = ssn.trim();
  if (!SSN_SHAPE.test(trimmed)) {
    return { valid: false, error: "SSN must be in the format XXX-XX-XXXX" };
  }

  const [area, group, serial] = trimmed.split("-");

  if (area === "000") return { valid: false, error: "Please double-check your SSN" };
  if (area === "666") return { valid: false, error: "Please double-check your SSN" };
  if (area.startsWith("9")) return { valid: false, error: "Please double-check your SSN" };
  if (group === "00") return { valid: false, error: "Please double-check your SSN" };
  if (serial === "0000") return { valid: false, error: "Please double-check your SSN" };

  if (/^(\d)\1{2}-\1{2}-\1{4}$/.test(trimmed)) {
    return { valid: false, error: "Please double-check your SSN" };
  }

  if (KNOWN_INVALID.has(trimmed)) {
    return { valid: false, error: "Please double-check your SSN" };
  }

  return { valid: true };
}
