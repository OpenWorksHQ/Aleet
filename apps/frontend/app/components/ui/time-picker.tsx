"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Dropdown, FieldTrigger, Popup } from "./dropdown";
import { slotFromTimeStr, type TimeSlot } from "@/lib/booking-constraints";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"] as const;

function cycle<T>(arr: readonly T[], current: T, dir: 1 | -1): T {
    const idx = arr.indexOf(current);
    const safeIdx = idx === -1 ? 0 : idx;
    return arr[(safeIdx + dir + arr.length) % arr.length];
}

function snapMinute(minute: string): string {
    const n = parseInt(minute, 10);
    if (Number.isNaN(n)) return "00";
    if (n < 8) return "00";
    if (n < 23) return "15";
    if (n < 38) return "30";
    if (n < 53) return "45";
    return "00";
}

function slotFromValue(value: string | undefined, fallback?: TimeSlot): TimeSlot {
    if (value?.trim()) {
        const slot = slotFromTimeStr(value);
        return {
            hour: HOURS.includes(slot.hour) ? slot.hour : "12",
            minute: MINUTES.includes(slot.minute) ? slot.minute : snapMinute(slot.minute),
            period: slot.period === "AM" || slot.period === "PM" ? slot.period : "PM",
        };
    }
    if (fallback) {
        return {
            hour: HOURS.includes(fallback.hour) ? fallback.hour : "12",
            minute: MINUTES.includes(fallback.minute) ? fallback.minute : snapMinute(fallback.minute),
            period: fallback.period === "AM" || fallback.period === "PM" ? fallback.period : "PM",
        };
    }
    return { hour: "12", minute: "00", period: "PM" };
}

export function TimePicker({
    label,
    value,
    onChange,
    placeholder = "Select Time",
    placement = "bottom",
    disableSlot,
    disabledMessage = "This time is not available",
    /** When value is empty, open the spinner on this slot (e.g. next available). */
    anchorSlot,
}: {
    label: string;
    value: string;
    onChange: (t: string) => void;
    placeholder?: string;
    placement?: "top" | "bottom";
    disableSlot?: (slot: { hour: string; minute: string; period: string }) => boolean;
    disabledMessage?: string;
    anchorSlot?: TimeSlot;
}) {
    const initial = slotFromValue(value, anchorSlot);
    const [open, setOpen] = useState(false);
    const [hour, setHour] = useState(initial.hour);
    const [minute, setMinute] = useState(initial.minute);
    const [period, setPeriod] = useState(initial.period);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Keep spinner aligned with the committed value (or anchor) whenever the popup opens.
    useEffect(() => {
        if (!open) return;
        const slot = slotFromValue(value, anchorSlot);
        setHour(slot.hour);
        setMinute(slot.minute);
        setPeriod(slot.period);
    }, [open, value, anchorSlot]);

    const isCurrentSlotDisabled = disableSlot?.({ hour, minute, period }) ?? false;

    function confirm() {
        if (isCurrentSlotDisabled) return;
        onChange(`${hour}:${minute} ${period}`);
        setOpen(false);
    }

    function handleClear() {
        onChange("");
        setOpen(false);
    }

    function handleClose() {
        setOpen(false);
    }

    return (
        <Dropdown open={open} onClose={handleClose}>
            <div ref={triggerRef}>
                <FieldTrigger
                    label={label}
                    value={value}
                    placeholder={placeholder}
                    icon={<Clock className="h-3.5 w-3.5" />}
                    open={open}
                    onClick={() => setOpen((v) => !v)}
                />
            </div>
            {open && (
                <Popup anchorRef={triggerRef} placement={placement}>
                    <div className="w-full px-4 pt-4 pb-3">
                        <div className="grid grid-cols-3 gap-2">
                            <SpinnerColumn
                                value={hour}
                                onUp={() => setHour(cycle(HOURS, hour, 1))}
                                onDown={() => setHour(cycle(HOURS, hour, -1))}
                            />
                            <SpinnerColumn
                                value={minute}
                                onUp={() => setMinute(cycle(MINUTES, minute, 1))}
                                onDown={() => setMinute(cycle(MINUTES, minute, -1))}
                            />
                            <SpinnerColumn
                                value={period}
                                onUp={() => setPeriod(cycle(PERIODS, period, 1))}
                                onDown={() => setPeriod(cycle(PERIODS, period, -1))}
                            />
                        </div>

                        {isCurrentSlotDisabled && (
                            <p className="mt-2 text-center text-[11px] text-red-500/80">
                                {disabledMessage}
                            </p>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="rounded-lg border border-aleet-border py-2 text-[13px] font-semibold text-aleet-text-muted transition-colors hover:border-aleet-border-strong hover:text-aleet-text"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                disabled={isCurrentSlotDisabled}
                                onClick={confirm}
                                className="rounded-lg bg-aleet-gold py-2 text-[13px] font-semibold text-aleet-text transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Select
                            </button>
                        </div>
                    </div>
                </Popup>
            )}
        </Dropdown>
    );
}

function SpinnerColumn({
    value,
    onUp,
    onDown,
}: {
    value: string;
    onUp: () => void;
    onDown: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <button
                type="button"
                onClick={onUp}
                className="flex h-7 w-full items-center justify-center rounded-md text-aleet-text-subtle transition-colors hover:bg-aleet-cream hover:text-aleet-text"
            >
                <ChevronUp className="h-4 w-4" strokeWidth={2} />
            </button>
            <div className="flex h-10 w-full items-center justify-center rounded-lg bg-aleet-cream-muted text-[22px] font-semibold text-aleet-text tabular-nums">
                {value}
            </div>
            <button
                type="button"
                onClick={onDown}
                className="flex h-7 w-full items-center justify-center rounded-md text-aleet-text-subtle transition-colors hover:bg-aleet-cream hover:text-aleet-text"
            >
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </button>
        </div>
    );
}
