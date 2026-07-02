import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";

export function AuthMenu() {
  return <AppHeader />;
}

export function AuthFooter() {
  return (
    <footer className={cn("mt-auto pt-14 sm:pt-20")}>
      <div className={cn("mb-7 border-t border-aleet-border")} />
      <div className={cn("flex flex-wrap items-center justify-between gap-5")}>
        <nav className={cn("flex flex-wrap gap-6")} aria-label="Social media">
          <Link className={cn("text-xs text-aleet-text-muted no-underline hover:text-aleet-gold")} href="#">
            Instagram
          </Link>
          <Link className={cn("text-xs text-aleet-text-muted no-underline hover:text-aleet-gold")} href="#">
            TikTok
          </Link>
        </nav>
        <nav className={cn("flex flex-wrap gap-6")} aria-label="Legal">
          <Link className={cn("text-xs text-aleet-text-muted no-underline hover:text-aleet-gold")} href="#">
            About
          </Link>
          <Link className={cn("text-xs text-aleet-text-muted no-underline hover:text-aleet-gold")} href="#">
            Privacy Policy
          </Link>
          <Link className={cn("text-xs text-aleet-text-muted no-underline hover:text-aleet-gold")} href="#">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
