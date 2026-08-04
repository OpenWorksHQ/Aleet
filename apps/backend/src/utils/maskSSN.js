/**
 * utils/maskSSN.js
 * ---------------------------------------------------------------------------
 * Single source of truth for SSN masking in API responses.
 *
 * Extracted from two byte-identical copies that had drifted apart into
 * controllers/adminController.js and services/userService.js. Behavior is
 * unchanged from those copies:
 *   - falsy input      → null (never the string "null")
 *   - strips non-digits, then shows only the trailing 4
 *   - fewer than 4 digits simply yields a shorter tail (still no full SSN)
 *
 * The raw SSN must never leave the API — always pass it through here.
 * ---------------------------------------------------------------------------
 */

const maskSSN = (ssn) => {
  if (!ssn) return null;
  const digits = String(ssn).replace(/\D/g, '');
  return `***-**-${digits.slice(-4)}`;
};

module.exports = { maskSSN };
