import Link from "next/link";
import { cn } from "@/lib/utils";
import { SiteMenu } from "./site-menu";

export function AuthMenu() {
  return (
    <header className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-6")}>
      <SiteMenu />

      <Link
        href="/login"
        className={cn("justify-self-center inline-flex items-center gap-2 text-[#bca066] no-underline sm:gap-3.5")}
        aria-label="Aleet home"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#bca066] font-serif text-[20px] leading-none font-semibold sm:h-10.5 sm:w-10.5 sm:border-4 sm:text-[26px]">
          A
        </span>
        <span className="text-[28px] leading-none font-semibold tracking-[-0.02em] sm:text-[36px]">
          Aleet
        </span>
      </Link>

      {/* <button
        className={cn(
          "justify-self-end inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[#222] px-1 py-[3px] pr-[6px] text-[#b8b8b8] sm:px-2 sm:pr-[8px]",
        )}
        type="button"
        aria-label="Light mode"
      >
        <span className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff6e2_25%,#a88b4f_70%)]" />
        <span className="hidden text-left text-[10px] leading-[1.05] sm:inline">
          Light
          <br />
          Mode
        </span>
      </button> */}
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className={cn("mt-auto pt-14 sm:pt-20")}>
      <div className={cn("mb-7 border-t border-[#1e2125]")} />
      <div className={cn("flex flex-wrap items-center justify-between gap-5")}>
        <nav className={cn("flex flex-wrap gap-6")} aria-label="Social media">
          <Link className={cn("text-xs text-white/90 no-underline")} href="#">
            Instagram
          </Link>
          <Link className={cn("text-xs text-white/90 no-underline")} href="#">
            TikTok
          </Link>
        </nav>
        <nav className={cn("flex flex-wrap gap-6")} aria-label="Legal">
          <Link className={cn("text-xs text-white/90 no-underline")} href="#">
            About
          </Link>
          <Link className={cn("text-xs text-white/90 no-underline")} href="#">
            Privacy Policy
          </Link>
          <Link className={cn("text-xs text-white/90 no-underline")} href="#">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
