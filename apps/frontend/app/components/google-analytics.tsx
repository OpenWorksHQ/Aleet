"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function trackPageView(pagePath: string) {
  if (!GA_ID) return;
  window.gtag?.("config", GA_ID, { page_path: pagePath });
}

/**
 * GA4 via gtag.js. Requires NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. G-EJLH5T32V4).
 * Wrapped in <Suspense> in layout.tsx because of useSearchParams().
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gtagReady = useRef(false);
  const lastTrackedPath = useRef<string | null>(null);

  const pagePath =
    pathname != null
      ? `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
      : null;

  // SPA navigations after gtag has loaded
  useEffect(() => {
    if (!GA_ID || !pagePath || !gtagReady.current) return;
    if (lastTrackedPath.current === pagePath) return;
    lastTrackedPath.current = pagePath;
    trackPageView(pagePath);
  }, [pagePath]);

  if (!GA_ID) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[GA] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set — analytics disabled.",
      );
    }
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        onReady={() => {
          gtagReady.current = true;
          if (pagePath && lastTrackedPath.current !== pagePath) {
            lastTrackedPath.current = pagePath;
            trackPageView(pagePath);
          }
        }}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
