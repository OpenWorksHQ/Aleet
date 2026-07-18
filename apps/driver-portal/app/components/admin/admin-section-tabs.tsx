"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminSectionTab = {
  id: string;
  label: string;
  badge?: number;
};

type ButtonTabsProps = {
  tabs: AdminSectionTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function AdminSectionTabs({ tabs, activeId, onChange, className }: ButtonTabsProps) {
  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
            activeId === tab.id
              ? "border-gold/40 bg-gold/15 text-gold"
              : "border-border text-muted hover:text-text",
          )}
        >
          {tab.label}
          {tab.badge != null ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

type LinkTabsProps = {
  tabs: Array<{ href: string; label: string; active: boolean }>;
  className?: string;
};

export function AdminLinkTabs({ tabs, className }: LinkTabsProps) {
  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
            tab.active
              ? "border-gold/40 bg-gold/15 text-gold"
              : "border-border text-muted hover:text-text",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
