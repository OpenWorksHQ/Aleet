import Link from "next/link";
import { cn } from "@/lib/utils";

type PartnerDashboardNavButtonProps = {
  href?: string;
  label?: string;
  hint?: string;
  variant?: "primary" | "secondary";
  className?: string;
  fullWidth?: boolean;
};

export function PartnerDashboardNavButton({
  href = "/partners/dashboard",
  label = "Go to partner dashboard",
  hint,
  variant = "primary",
  className,
  fullWidth = false,
}: PartnerDashboardNavButtonProps) {
  return (
    <div className={cn(className)}>
      {hint ? (
        <p className="mb-3 text-[12px] leading-relaxed text-aleet-text-muted">{hint}</p>
      ) : null}
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-semibold no-underline transition-opacity hover:opacity-90",
          fullWidth && "w-full",
          variant === "primary"
            ? "bg-aleet-gold text-black"
            : "border border-aleet-border bg-aleet-card text-aleet-text",
        )}
      >
        {label}
      </Link>
    </div>
  );
}
