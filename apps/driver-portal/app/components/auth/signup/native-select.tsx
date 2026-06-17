"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NativeSelectProps {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    disabled?: boolean;
}

export function NativeSelect({ value, onChange, options, placeholder, disabled }: NativeSelectProps) {
    return (
        <div className="relative">
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-12 w-full appearance-none rounded-lg border border-border bg-page-bg px-3.5 pr-10 text-[15px] outline-none transition-colors focus:border-gold/50 sm:h-13.5 sm:text-[16px]",
                    value ? "text-text" : "text-muted",
                    disabled && "opacity-50 cursor-not-allowed",
                )}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
    );
}
