import type { Metadata } from "next";
import { Karla } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleMapsProvider } from "./components/google-maps-provider";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Aleet - Book a Ride, Track Your Trip",
  description: "Aleet is your go-to platform for seamless ride booking, real-time trip tracking, and effortless account management.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${karla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0d1a19",
              border: "1px solid #1e2b2a",
              color: "#e8e8e8",
              fontFamily: "var(--font-karla), Karla, sans-serif",
              fontSize: "14px",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
          }}
        />
      </body>
    </html>
  );
}
