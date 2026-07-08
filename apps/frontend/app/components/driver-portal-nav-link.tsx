import { getDriverPortalLoginUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type DriverPortalNavLinkProps = {
  variant?: "become-a-driver" | "menu" | "account-menu";
  label?: string;
  className?: string;
  onNavigate?: () => void;
};

export function DriverPortalNavLink({
  variant = "account-menu",
  label,
  className,
  onNavigate,
}: DriverPortalNavLinkProps) {
  const href = getDriverPortalLoginUrl();
  const text =
    label ?? (variant === "account-menu" ? "Driver Portal" : "Become a Driver");

  if (variant === "become-a-driver") {
    return (
      <a
        href={href}
        className={cn(
          "rounded-md bg-aleet-gold px-4 py-2 text-[12px] font-semibold text-black no-underline transition-opacity hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-[13px]",
          className,
        )}
        onClick={onNavigate}
      >
        Become a Driver
      </a>
    );
  }

  if (variant === "menu") {
    return (
      <a
        href={href}
        className={cn(
          "rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted",
          className,
        )}
        onClick={onNavigate}
      >
        {text}
      </a>
    );
  }

  return (
    <a
      href={href}
      role="menuitem"
      className={cn(
        "block px-4 py-2.5 text-[13px] text-aleet-text no-underline transition-colors hover:bg-aleet-cream",
        className,
      )}
      onClick={onNavigate}
    >
      {text}
    </a>
  );
}
