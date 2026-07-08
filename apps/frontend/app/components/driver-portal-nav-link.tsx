import { getDriverPortalLoginUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type DriverPortalNavLinkProps = {
  variant?: "header" | "menu" | "account-menu";
  className?: string;
  onNavigate?: () => void;
};

export function DriverPortalNavLink({
  variant = "header",
  className,
  onNavigate,
}: DriverPortalNavLinkProps) {
  const href = getDriverPortalLoginUrl();

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
        Driver Portal
      </a>
    );
  }

  if (variant === "account-menu") {
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
        Driver Portal
      </a>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        "hidden text-[13px] text-white/85 no-underline transition-colors hover:text-white sm:inline xl:text-[14px]",
        className,
      )}
      onClick={onNavigate}
    >
      Driver Portal
    </a>
  );
}
