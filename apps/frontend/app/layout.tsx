import type { Metadata } from "next";
import { Karla, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleMapsProvider } from "./components/google-maps-provider";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
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
      className={`${karla.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-aleet-cream text-aleet-text">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              border: "1px solid #e5dfd4",
              color: "#1a1510",
              fontFamily: "var(--font-karla), Karla, sans-serif",
              fontSize: "14px",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(26,21,16,0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}
