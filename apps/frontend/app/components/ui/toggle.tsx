"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    ariaLabel?: string;
    className?: string;
}

export function Toggle({ checked, onChange, ariaLabel, className }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full border p-1 shadow-[inset_0_1px_3px_rgba(26,21,16,0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aleet-gold/50",
                checked
                    ? "border-aleet-gold/40 bg-aleet-gold/15"
                    : "border-aleet-border bg-aleet-cream-muted",
                className,
            )}
        >
            <span
                className={cn(
                    "absolute flex h-5 w-5 items-center justify-center rounded-full shadow-[0_1px_4px_rgba(26,21,16,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    checked
                        ? "translate-x-7 bg-aleet-card ring-1 ring-aleet-gold/60"
                        : "translate-x-0 bg-aleet-card ring-1 ring-aleet-border",
                )}
            >
                <span
                    className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-200",
                        checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
                    )}
                >
                    <Check className="h-3 w-3 text-aleet-gold" strokeWidth={2.5} />
                </span>
                <span
                    className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-200",
                        checked ? "scale-50 opacity-0" : "scale-100 opacity-100",
                    )}
                >
                    <X className="h-3 w-3 text-aleet-text-subtle" strokeWidth={2.5} />
                </span>
            </span>

            <span
                className={cn(
                    "absolute left-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300",
                    checked
                        ? "translate-x-0 text-aleet-gold opacity-100"
                        : "-translate-x-0.5 text-aleet-gold opacity-0",
                )}
            >
                Yes
            </span>

            <span
                className={cn(
                    "absolute right-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300",
                    checked
                        ? "translate-x-0.5 text-aleet-text-subtle opacity-0"
                        : "translate-x-0 text-aleet-text-subtle opacity-100",
                )}
            >
                No
            </span>
        </button>
    );
}
