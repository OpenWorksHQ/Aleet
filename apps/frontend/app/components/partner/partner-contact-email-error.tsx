import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site-contact";

export type PartnerFieldErrorDetail = {
  code?: string;
  action?: "login" | "support";
};

export function getPartnerFieldError(
  errors: unknown,
  field: string,
): PartnerFieldErrorDetail | null {
  if (!errors || typeof errors !== "object") return null;
  const detail = (errors as Record<string, PartnerFieldErrorDetail>)[field];
  return detail ?? null;
}

type PartnerContactEmailErrorProps = {
  message: string;
  detail?: PartnerFieldErrorDetail | null;
};

export function PartnerContactEmailError({
  message,
  detail,
}: PartnerContactEmailErrorProps) {
  const showLoginLinks =
    detail?.action === "login" ||
    detail?.code === "portal_active" ||
    detail?.code === "portal_invite_pending" ||
    detail?.code === "partner_registered";

  return (
    <p className="mt-1.5 text-[13px] leading-relaxed text-red-600">
      {message}
      {showLoginLinks ? (
        <>
          {" "}
          <Link href="/partners/login" className="font-semibold underline underline-offset-2">
            Partner sign in
          </Link>
          {" · "}
          <Link
            href="/partners/forgot-password"
            className="font-semibold underline underline-offset-2"
          >
            Forgot password
          </Link>
        </>
      ) : null}
      {detail?.action === "support" ? (
        <>
          {" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold underline underline-offset-2"
          >
            Contact support
          </a>
        </>
      ) : null}
    </p>
  );
}
