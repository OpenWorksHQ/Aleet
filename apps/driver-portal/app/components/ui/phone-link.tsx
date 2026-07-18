import type { ReactNode } from "react";
import { toTelHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneLinkProps = {
  phone: string | null | undefined;
  className?: string;
  fallback?: ReactNode;
};

/** Renders stored phone as a clickable `tel:` link when dialable. */
export function PhoneLink({ phone, className, fallback = "—" }: PhoneLinkProps) {
  const href = toTelHref(phone);
  if (!href || !phone) return <>{fallback}</>;

  return (
    <a
      href={href}
      className={cn("text-gold hover:underline", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {phone}
    </a>
  );
}
