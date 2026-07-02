"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/lib/nav-config";
import {
  DashboardIcon,
  TripHistoryIcon,
  BookTripIcon,
  PaymentsIcon,
  SubscriptionIcon,
} from "@/app/components/ui/icons";

const ICONS = {
  dashboard: DashboardIcon,
  history: TripHistoryIcon,
  book: BookTripIcon,
  payments: PaymentsIcon,
  subscription: SubscriptionIcon,
} as const;

export function SideNav({ initialActive = "dashboard" }: { initialActive?: string }) {
  const pathname = usePathname();

  const activeKey =
    DASHBOARD_NAV.find((item) => pathname.startsWith(item.href))?.key ??
    initialActive;

  return (
    <nav aria-label="Dashboard navigation">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {DASHBOARD_NAV.map(({ key, label, href }) => {
          const Icon = ICONS[key];
          const isActive = activeKey === key;

          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "inline-flex min-w-[132px] shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium no-underline transition-colors lg:min-w-0 lg:w-full",
                isActive
                  ? "border-aleet-gold/30 bg-aleet-gold/10 text-aleet-gold"
                  : "border-transparent bg-transparent text-aleet-text-muted hover:border-aleet-border hover:bg-aleet-cream hover:text-aleet-text",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
