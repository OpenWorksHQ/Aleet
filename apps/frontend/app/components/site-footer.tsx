import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-aleet-border-strong bg-aleet-footer px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr_1fr] lg:items-center lg:gap-0">
        <div className="max-w-md lg:pr-10">
          <Link
            href="/teams"
            className="text-[14px] font-semibold text-aleet-text no-underline transition-colors hover:text-aleet-gold"
          >
            Investor Resources
          </Link>
          <p className="mt-1.5 text-[12px] leading-relaxed text-aleet-text-muted sm:text-[13px]">
            Membership includes exclusive access to all concierge services across
            DMV · NYC · Miami · LA · ATL and more
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-aleet-border-strong pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3 lg:border-t-0 lg:border-l lg:px-10 lg:pt-0">
          <a
            href="tel:18003052535"
            className="inline-flex items-center gap-2.5 text-[13px] text-aleet-text-muted no-underline transition-colors hover:text-aleet-text"
          >
            <PhoneIcon />
            1 (800) 305-2535
          </a>
          <a
            href="mailto:support@aleetluxury.com"
            className="inline-flex items-center gap-2.5 text-[13px] text-aleet-text-muted no-underline transition-colors hover:text-aleet-text"
          >
            <MailIcon />
            support@aleetluxury.com
          </a>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-aleet-border-strong pt-8 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <p className="text-[12px] text-aleet-text-subtle">Download the Aleet App</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="#" className="no-underline" aria-label="Download on the App Store">
              <AppStoreBadge />
            </Link>
            <Link href="#" className="no-underline" aria-label="Get it on Google Play">
              <GooglePlayBadge />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppStoreBadge() {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white">
      <AppleIcon />
      <div className="leading-none">
        <p className="text-[8px]">Download on the</p>
        <p className="text-[13px] font-semibold">App Store</p>
      </div>
    </div>
  );
}

function GooglePlayBadge() {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white">
      <PlayStoreIcon />
      <div className="leading-none">
        <p className="text-[8px] uppercase">Get it on</p>
        <p className="text-[13px] font-semibold">Google Play</p>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c5a386" strokeWidth="1.5" className="h-4 w-4 shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c5a386" strokeWidth="1.5" className="h-4 w-4 shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M3 20.5V3.5c0-.85.69-1.27 1.28-.89L21 12 4.28 21.39c-.59.38-1.28-.04-1.28-.89Zm2-14.68v12.36L14.37 12 5 5.82Zm10.75 5.25L7.5 4.84l10.63 6.23-2.38.01ZM7.5 19.16l8.25-6.23-8.25.01v6.22Z" />
    </svg>
  );
}
