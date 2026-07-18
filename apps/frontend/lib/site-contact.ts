import { toTelHref } from "@/lib/phone";

/** Public contact details — override phone via NEXT_PUBLIC_CONTACT_PHONE in .env.local */
const DEFAULT_CONTACT_PHONE = "5714449112";

export const CONTACT_EMAIL = "swifthavenaleet@gmail.com";
export const INSTAGRAM_URL = "https://instagram.com/aleet.app";
/** Visible link label — URL stays in href only. */
export const INSTAGRAM_LABEL = "Instagram";

export function getContactPhoneDigits(): string {
  const raw = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || DEFAULT_CONTACT_PHONE;
  return raw.replace(/\D/g, "");
}

export function formatContactPhone(digits = getContactPhoneDigits()): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

export function contactPhoneTelHref(digits = getContactPhoneDigits()): string {
  return toTelHref(digits) ?? `tel:${digits}`;
}
