"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

type BookingMode = "buy-hours" | "multi-day";

type BookingModeSwitchProps = {
    mode: BookingMode;
    onModeChange: (mode: BookingMode) => void;
};

export function BookingModeSwitch({ mode, onModeChange }: BookingModeSwitchProps) {
    return (
        <div className="mb-3 flex justify-center sm:mb-4">
            <div className="relative inline-flex w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#2a3336] bg-[#0b1415]/85 p-1">
                <span
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute top-1 h-12 w-[calc(50%-4px)] rounded-xl border border-[#bca066]/30 bg-[#2a2520] transition-transform duration-300 ease-out",
                        mode === "buy-hours" ? "left-1 translate-x-0" : "left-1 translate-x-full",
                    )}
                />
                <button
                    type="button"
                    onClick={() => onModeChange("buy-hours")}
                    className={cn(
                        "relative z-10 inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-medium transition-colors",
                        mode === "buy-hours" ? "text-[#e8d9b2]" : "text-white/78 hover:text-white",
                    )}
                >
                    <Clock3 className="h-4.5 w-4.5" />
                    Buy Hours
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange("multi-day")}
                    className={cn(
                        "relative z-10 inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-medium transition-colors",
                        mode === "multi-day" ? "text-[#e8d9b2]" : "text-white/78 hover:text-white",
                    )}
                >
                    <CalendarDays className="h-4.5 w-4.5" />
                    Multi-Day
                </button>
            </div>
        </div>
    );
}
