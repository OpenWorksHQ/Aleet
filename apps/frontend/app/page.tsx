import Image from "next/image";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";
import {
  CONTACT_EMAIL,
  INSTAGRAM_LABEL,
  INSTAGRAM_URL,
  contactPhoneTelHref,
  formatContactPhone,
} from "@/lib/site-contact";
import { AppHeader } from "./components/app-header";
import { BookingForm } from "./components/booking-form";
import { HomePartnerNotice } from "./components/partner/home-partner-notice";
import heroImage from "@/public/images/homepage/homepage_hero.jpeg";

export const metadata = createPageMetadata({
  path: "/",
  title: "Aleet - Book a Ride, Track Your Trip",
  description:
    "Aleet is your go-to platform for seamless ride booking, real-time trip tracking, and effortless account management.",
});

const GOLD = "#c5a386";
const CREAM = "#f9f7f2";

const FEATURES = [
  {
    icon: ShieldIcon,
    title: "Trusted Professionals",
    text: "Every driver is verified and committed to your safety.",
  },
  {
    icon: SlidersIcon,
    title: "Curated Options",
    text: "We match you with the right service for every occasion.",
  },
  {
    icon: Phone24Icon,
    title: "Always Here",
    text: "Support when you need it, before, during, and after.",
  },
  {
    icon: LockIcon,
    title: "Your Experience",
    text: "Private, secure, and designed around your needs.",
  },
] as const;

export default function HomePage() {
  return (
    <div
      className="overflow-x-hidden text-aleet-text"
      style={{ backgroundColor: CREAM }}
    >
      {/* ─── Black navbar ─── */}
      <AppHeader showMarketingNav />

      {/* ─── Split hero ─── */}
      <div className="relative">
        <div className="flex flex-col lg:min-h-[520px] lg:flex-row xl:min-h-[560px]">
          {/* Left — cream panel + copy */}
          <div
            className="relative z-10 flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:w-[46%] lg:px-12 lg:pl-20 lg:py-14 xl:w-[44%] xl:px-16 xl:pl-30"
            style={{ backgroundColor: CREAM }}
          >
            <div className="max-w-[480px] ">
              <h1
                className="font-serif text-[32px] leading-[1.14] text-aleet-text sm:text-[40px] xl:text-[48px]"
              >
                Curated access.
                <br />
                Transportation and
                <br />
                services that fit{" "}
                <em
                  className="font-serif not-italic"
                  style={{
                    fontStyle: "italic",
                    color: GOLD,
                  }}
                >
                  your life.
                </em>
              </h1>

              <p className="mt-5 max-w-[400px] text-[13px] leading-[1.75] text-aleet-text-muted sm:text-[14px]">
                Professional drivers, event access, multi-day travel, and
                concierge services — all in one place. Available to members
                only.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-5 sm:gap-7">
                <CategoryItem
                  icon={<TransportationIcon />}
                  label="Transportation"
                />
                <CategoryItem icon={<AccessIcon />} label="Access" />
                <CategoryItem icon={<ConciergeIcon />} label="Concierge" />
              </div>
            </div>
          </div>

          {/* Right — hero image with left fade */}
          <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-0 lg:flex-1">
            <Image
              src={heroImage}
              alt="Luxury chauffeur service"
              className="object-cover object-[72%_center]"
              fill
              sizes="(max-width: 1024px) 100vw, 56vw"
              priority
            />
            <div
              className="pointer-events-none absolute inset-0 lg:hidden"
              style={{
                background:
                  "linear-gradient(to bottom, #f9f7f2 0%, rgba(249,247,242,0.55) 18%, transparent 42%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 hidden lg:block"
              style={{
                background:
                  "linear-gradient(to right, #f9f7f2 0%, rgba(249,247,242,0.92) 8%, rgba(249,247,242,0.55) 18%, rgba(249,247,242,0.15) 32%, transparent 48%)",
              }}
            />
          </div>
        </div>

        {/* Booking bar — overlaps hero / features */}
        <div className="relative z-20 -mt-8 px-5  sm:px-8 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:mt-0 lg:translate-y-1/2 lg:px-12 xl:px-16">
          <div className="mx-auto w-full  max-w-[1440px]">
            <HomePartnerNotice />
            <BookingForm />
          </div>
        </div>
      </div>

      {/* ─── Features ─── */}
      <section
        className="relative px-5 pt-10 pb-10 sm:px-8 sm:pt-32 sm:pb-12 lg:px-12 lg:pt-36 xl:px-16"
        style={{ backgroundColor: CREAM }}
      >
        <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
        <div className="relative mx-auto w-full max-w-[1440px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <FeatureColumn
                  key={feature.title}
                  icon={<Icon />}
                  title={feature.title}
                  text={feature.text}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#e0dacf] bg-[#f3f0ea] px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr_1fr] lg:items-center lg:gap-0">
          {/* Brand */}
          <div className="max-w-md lg:pr-10">
            <Link
              href="/teams"
              className="text-[14px] font-semibold text-[#1a1510] no-underline transition-colors hover:text-aleet-gold"
            >
              Investor Resources
            </Link>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#6a6054] sm:text-[13px]">
              Membership includes exclusive access to all concierge services
              across DMV · NYC · Miami · LA · ATL and more
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4 border-t border-[#d8d0c4] pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3 lg:border-t-0 lg:border-l lg:px-10 lg:pt-0">
            <a
              href={contactPhoneTelHref()}
              className="inline-flex items-center gap-2.5 text-[13px] text-[#4a4338] no-underline transition-colors hover:text-[#1a1510]"
            >
              <PhoneIcon />
              {formatContactPhone()}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2.5 text-[13px] text-[#4a4338] no-underline transition-colors hover:text-[#1a1510]"
            >
              <MailIcon />
              {CONTACT_EMAIL}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Aleet on Instagram"
              className="inline-flex items-center gap-2.5 text-[13px] text-[#4a4338] no-underline transition-colors hover:text-[#1a1510]"
            >
              <InstagramIcon />
              {INSTAGRAM_LABEL}
            </a>
          </div>

          {/* App download */}
          <div className="flex flex-col gap-2.5 border-t border-[#d8d0c4] pt-8 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
            <p className="text-[12px] text-[#8a8074]">Download the Aleet App</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="#"
                className="no-underline"
                aria-label="Download on the App Store"
              >
                <AppStoreBadge />
              </Link>
              <Link
                href="#"
                className="no-underline"
                aria-label="Get it on Google Play"
              >
                <GooglePlayBadge />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoryItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: GOLD }} className="text-[16px]">
        {icon}
      </span>
      <span className="text-[13px] sm:text-[14px] text-black">{label}</span>
    </div>
  );
}

function FeatureColumn({
  icon,
  title,
  text,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  index: number;
}) {
  return (
    <div
      className={[
        "flex items-start gap-3 px-0 py-5 sm:px-5 lg:px-6 lg:py-3",
        index > 0 ? "border-t border-[#d8d0c4]" : "",
        index > 0 ? "sm:border-t-0" : "",
        index % 2 === 1 ? "sm:border-l sm:border-[#d8d0c4]" : "",
        index >= 2 ? "sm:border-t sm:border-[#d8d0c4]" : "",
        index >= 2 ? "lg:border-t-0" : "",
        index > 0 ? "lg:border-l lg:border-[#d8d0c4]" : "",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0" style={{ color: GOLD }}>
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold leading-snug text-[#1a1510] sm:text-[15px]">
          {title}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6a6054] sm:text-[13px]">
          {text}
        </p>
      </div>
    </div>
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

function TransportationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function ConciergeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-6 w-6"
    >
      <path d="M12 3.5 4 7v5c0 5 3.5 8 8 9.5 4.5-1.5 8-4.5 8-9.5V7l-8-3.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-6 w-6"
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M2 14h4M10 8h4M18 16h4" />
    </svg>
  );
}

function Phone24Icon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-6 w-6"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
      <path d="M14 5h6M17 2v6" strokeWidth="1.2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-6 w-6"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c5a386"
      strokeWidth="1.5"
      className="h-4 w-4 shrink-0"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c5a386"
      strokeWidth="1.5"
      className="h-4 w-4 shrink-0"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c5a386"
      strokeWidth="1.5"
      className="h-4 w-4 shrink-0"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="#c5a386" stroke="none" />
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
