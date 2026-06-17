"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Basic Info", "About You", "Documents"] as const;

export function Stepper({ current }: { current: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                    done || active
                                        ? "bg-gold text-black"
                                        : "border border-border bg-transparent text-muted",
                                )}
                            >
                                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-medium whitespace-nowrap",
                                    active || done ? "text-gold" : "text-muted",
                                )}
                            >
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "h-px w-10 sm:w-16 mx-1 mb-5 transition-colors",
                                    done ? "bg-gold" : "bg-border",
                                )}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
