"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    /** Accessible label for the button */
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
                "relative inline-flex h-7 w-14 cursor-pointer items-center rounded-full border p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bca066]/50",
                checked
                    ? "border-[#bca066]/40 bg-[#1a160a]"
                    : "border-[#2e3638] bg-[#111918]",
                className,
            )}
        >
            {/* sliding knob */}
            <span
                className={cn(
                    "absolute flex h-5 w-5 items-center justify-center rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    checked
                        ? "translate-x-7 bg-[#2a1e08] ring-1 ring-[#bca066]/60"
                        : "translate-x-0 bg-[#1e2527] ring-1 ring-white/10",
                )}
            >
                {/* Check icon — visible when ON */}
                <span
                    className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-200",
                        checked ? "opacity-100 scale-100" : "opacity-0 scale-50",
                    )}
                >
                    <Check className="h-3 w-3 text-[#bca066]" strokeWidth={2.5} />
                </span>
                {/* X icon — visible when OFF */}
                <span
                    className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-200",
                        checked ? "opacity-0 scale-50" : "opacity-100 scale-100",
                    )}
                >
                    <X className="h-3 w-3 text-[#5a6870]" strokeWidth={2.5} />
                </span>
            </span>

            {/* "Yes" label — left side, visible when ON */}
            <span
                className={cn(
                    "absolute left-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300",
                    checked
                        ? "translate-x-0 opacity-100 text-[#bca066]"
                        : "-translate-x-0.5 opacity-0 text-[#bca066]",
                )}
            >
                Yes
            </span>

            {/* "No" label — right side, visible when OFF */}
            <span
                className={cn(
                    "absolute right-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300",
                    checked
                        ? "translate-x-0.5 opacity-0 text-[#5a6870]"
                        : "translate-x-0 opacity-100 text-[#5a6870]",
                )}
            >
                No
            </span>
        </button>
    );
}
