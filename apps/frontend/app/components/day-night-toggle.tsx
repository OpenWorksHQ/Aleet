"use client";

import { createContext, useContext, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { SunIcon, MoonIcon } from "./ui/icons";

type DayNightMode = "day" | "night";

interface DayNightContextValue {
    mode: DayNightMode;
    toggle: () => void;
}

const DayNightContext = createContext<DayNightContextValue | null>(null);

function useDayNight() {
    const ctx = useContext(DayNightContext);
    if (!ctx) throw new Error("useDayNight must be used inside DayNightProvider");
    return ctx;
}

export function DayNightProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<DayNightMode>("day");
    const toggle = () => setMode((m) => (m === "night" ? "day" : "night"));

    return (
        <DayNightContext.Provider value={{ mode, toggle }}>
            {children}
        </DayNightContext.Provider>
    );
}

interface DayNightBackgroundProps {
    bgDay: StaticImageData;
    bgNight: StaticImageData;
}

export function DayNightBackground({ bgDay, bgNight }: DayNightBackgroundProps) {
    const { mode } = useDayNight();

    return (
        <>
            <Image
                src={bgNight}
                alt="Night background"
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${mode === "night" ? "opacity-100" : "opacity-0"
                    }`}
                priority
            />
            <Image
                src={bgDay}
                alt="Day background"
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${mode === "day" ? "opacity-100" : "opacity-0"
                    }`}
                priority
            />
        </>
    );
}

export function DayNightToggleButton() {
    const { mode, toggle } = useDayNight();
    const isDay = mode === "day";

    return (
        <button
            type="button"
            aria-label={isDay ? "Switch to night mode" : "Switch to day mode"}
            onClick={toggle}
            className={`relative inline-flex h-9 w-19 cursor-pointer items-center rounded-full border p-1 shadow-[inset_0_1px_3px_rgba(26,21,16,0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aleet-gold/50 sm:h-10 sm:w-21 ${isDay
                ? "border-aleet-gold/40 bg-aleet-gold/15"
                : "border-aleet-border bg-aleet-cream-muted"
                }`}
        >
            {/* sliding knob */}
            <span
                className={`absolute flex h-7 w-7 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(26,21,16,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:h-8 sm:w-8 ${isDay
                    ? "translate-x-10 bg-aleet-card ring-1 ring-aleet-gold/60 sm:translate-x-11"
                    : "translate-x-0 bg-aleet-card ring-1 ring-aleet-border"
                    }`}
            >
                <span
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isDay ? "opacity-100 scale-100" : "opacity-0 scale-50"
                        }`}
                >
                    <SunIcon className="h-4.5 w-4.5 text-aleet-gold" />
                </span>
                <span
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isDay ? "opacity-0 scale-50" : "opacity-100 scale-100"
                        }`}
                >
                    <MoonIcon className="h-4.5 w-4.5 text-aleet-text-subtle" />
                </span>
            </span>

            {/* Light Mode label — left side, visible when day */}
            <span
                className={`absolute left-2.5 text-[9px] font-semibold uppercase leading-tight tracking-widest transition-all duration-300 ${isDay
                    ? "translate-x-0 text-aleet-gold opacity-100"
                    : "-translate-x-1 text-aleet-gold opacity-0"
                    }`}
            >
                Light
                <br />
                Mode
            </span>

            {/* Dark Mode label — right side, visible when night */}
            <span
                className={`absolute right-2.5 text-[9px] font-semibold uppercase leading-tight tracking-widest transition-all duration-300 ${isDay
                    ? "translate-x-1 text-aleet-text-subtle opacity-0"
                    : "translate-x-0 text-aleet-text-subtle opacity-100"
                    }`}
            >
                Dark
                <br />
                Mode
            </span>
        </button>
    );
}