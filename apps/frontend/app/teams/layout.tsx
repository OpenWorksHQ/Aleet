import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aleet Teams Portal",
  description:
    "Private access for strategic builders, investors, and leadership partners.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TeamsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
