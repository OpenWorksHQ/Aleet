import Link from "next/link";
import { SiteMenu } from "./site-menu";
import { HeaderAuthActions } from "./header-auth-actions";
import { MARKETING_NAV, type NavLink } from "@/lib/nav-config";

type AppHeaderProps = {
  /** Show centered marketing nav links (homepage). Default: hidden on app pages. */
  showMarketingNav?: boolean;
};

function MarketingNavLink({ item }: { item: NavLink }) {
  const className =
    "text-[13px] text-white/85 no-underline transition-colors hover:text-white xl:text-[14px]";

  if (item.external) {
    return (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

export function AppHeader({ showMarketingNav = false }: AppHeaderProps) {
  return (
    <header className="relative z-30 bg-black">
      <div className="mx-auto grid w-full max-w-[95%] grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-12 lg:py-[18px]">
        <div className="flex items-center gap-3 lg:justify-self-start">
          <div className="lg:hidden">
            <SiteMenu />
          </div>
          <Link
            href="/"
            className="text-[20px] font-normal tracking-[0.28em] text-white no-underline sm:text-[22px]"
          >
            ALEET
          </Link>
        </div>

        {showMarketingNav ? (
          <nav
            className="hidden items-center gap-7 lg:flex lg:justify-self-center xl:gap-9"
            aria-label="Main navigation"
          >
            {MARKETING_NAV.map((item) => (
              <MarketingNavLink key={item.label} item={item} />
            ))}
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="flex items-center justify-end lg:justify-self-end">
          <HeaderAuthActions />
        </div>
      </div>
    </header>
  );
}
