/** Build a clickable `tel:` href from any stored phone string (E.164 or digits). */
export function toTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits ? `tel:+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:+${digits}`;
}
