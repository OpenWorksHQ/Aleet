import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PUBLIC_MEMBERSHIP_PLANS,
  MEMBERSHIP_SAVINGS,
} from "@/lib/membership-plans";

type MembershipPlansSectionProps = {
  showSavings?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

export function MembershipPlansSection({
  showSavings = true,
  ctaHref = "/login",
  ctaLabel = "Join Aleet",
  className,
}: MembershipPlansSectionProps) {
  return (
    <div className={cn("space-y-10", className)}>
      <div className="mx-auto grid max-w-xl gap-5">
        {PUBLIC_MEMBERSHIP_PLANS.map((plan) => (
          <article
            key={plan.key}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 sm:p-7",
              plan.highlight
                ? "border-aleet-gold/40 bg-aleet-card shadow-[0_20px_50px_rgba(197,163,134,0.12)]"
                : "border-aleet-border bg-aleet-card",
            )}
          >
            {plan.tag ? (
              <span className="absolute right-5 top-5 rounded-full bg-aleet-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-aleet-text">
                {plan.tag}
              </span>
            ) : null}

            <p
              className={cn(
                "font-serif text-2xl",
                plan.highlight ? "text-aleet-gold" : "text-aleet-text",
              )}
            >
              {plan.name}
            </p>

            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-aleet-gold">
              Your locked-in member rate
            </p>
            <p className="mt-2">
              <span className="font-serif text-5xl font-medium text-aleet-text">
                ${plan.memberRate}
              </span>
              <span className="text-base text-aleet-text-muted">
                /hr on every ride
              </span>
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-aleet-text-muted">
              {plan.hours} hours included every month · Save up to $111/hr vs
              standard rates
            </p>
            <p className="mt-1 text-[12px] text-aleet-text-subtle">
              Billed quarterly at $
              {plan.billedQuarterly.toLocaleString("en-US")}
            </p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-[13px] leading-relaxed text-aleet-text-muted"
                >
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={ctaHref}
              className={cn(
                "mt-7 inline-flex h-12 items-center justify-center rounded-lg px-5 text-[14px] font-semibold no-underline transition-opacity hover:opacity-90",
                plan.highlight
                  ? "bg-aleet-gold text-aleet-text"
                  : "border border-aleet-border-strong bg-aleet-cream text-aleet-text",
              )}
            >
              {ctaLabel}
            </Link>
          </article>
        ))}
      </div>

      {showSavings ? (
        <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6 sm:p-8">
          <h3 className="font-serif text-2xl text-aleet-text">
            Member savings on every ride
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-aleet-text-muted">
            Locked-in hourly rates help you save on premium vehicles across
            every market we serve.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {MEMBERSHIP_SAVINGS.map((item) => (
              <div
                key={item.vehicle}
                className="rounded-xl border border-aleet-border bg-aleet-cream px-5 py-4"
              >
                <p className="text-sm font-semibold text-aleet-text">
                  {item.vehicle}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-aleet-text-subtle line-through">
                    ${item.regularPrice}/hr
                  </span>
                  <span className="text-sm font-semibold text-aleet-gold">
                    ${item.memberPrice}/hr
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-aleet-text-muted">
                  Save ${item.savings}/hr
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aleet-gold"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
