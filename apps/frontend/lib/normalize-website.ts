/** Normalize user-entered website values to a full https URL. */
export function normalizeWebsiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (!url.hostname || !url.hostname.includes(".")) {
      throw new Error("Invalid hostname");
    }
    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error("Enter a valid website (e.g. mango.com or https://mango.com)");
  }
}
