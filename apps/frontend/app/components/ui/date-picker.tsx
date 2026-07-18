"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Dropdown, FieldTrigger, Popup } from "./dropdown";

export function DatePicker({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = "Select Date",
    placement = "bottom",
}: {
    label: string;
    value: Date | undefined;
    onChange: (d: Date | undefined) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    placement?: "top" | "bottom";
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    return (
        <Dropdown open={open} onClose={() => setOpen(false)}>
            <div ref={triggerRef}>
                <FieldTrigger
                    label={label}
                    value={value ? format(value, "MMM d, yyyy") : ""}
                    placeholder={placeholder}
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    open={open}
                    onClick={() => setOpen((v) => !v)}
                />
            </div>
            {open && (
                <Popup anchorRef={triggerRef} placement={placement} matchWidth={false}>
                    <DayPicker
                        mode="single"
                        selected={value}
                        onSelect={(d) => {
                            onChange(d);
                            setOpen(false);
                        }}
                        disabled={[
                            { before: minDate ?? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })() },
                            ...(maxDate ? [{ after: maxDate }] : []),
                        ]}
                        classNames={DAY_PICKER_CLASS_NAMES}
                        components={{
                            Chevron: ({ orientation }) =>
                                orientation === "left" ? (
                                    <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                                ),
                        }}
                    />
                </Popup>
            )}
        </Dropdown>
    );
}

/** Homepage-style range picker for the booking route bar (light theme). */
export function DateRangePicker({
    label = "Date",
    startDate,
    endDate,
    onChange,
    minDate,
    placeholder = "Select date",
    placement = "bottom",
}: {
    label?: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    onChange: (range: { from: Date; to: Date } | undefined) => void;
    minDate?: Date;
    placeholder?: string;
    placement?: "top" | "bottom";
}) {
    const [open, setOpen] = useState(false);
    const [pendingFrom, setPendingFrom] = useState<Date | undefined>();
    const triggerRef = useRef<HTMLDivElement>(null);

    const min = minDate ?? (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    const finalize = useCallback(
        (from: Date | undefined, to: Date | undefined) => {
            if (!from) {
                onChange(undefined);
                return;
            }
            onChange({ from, to: to ?? from });
        },
        [onChange],
    );

    useEffect(() => {
        if (!open || !pendingFrom) return;
        function down(e: PointerEvent) {
            if (triggerRef.current?.contains(e.target as Node)) return;
            finalize(pendingFrom, pendingFrom);
            setPendingFrom(undefined);
            setOpen(false);
        }
        document.addEventListener("pointerdown", down);
        return () => document.removeEventListener("pointerdown", down);
    }, [open, pendingFrom, finalize]);

    const range: DateRange | undefined = startDate
        ? { from: startDate, to: endDate ?? startDate }
        : undefined;

    const isMultiDay =
        !!startDate && !!endDate && startDate.getTime() !== endDate.getTime();

    const display = !startDate
        ? ""
        : isMultiDay && endDate
            ? `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
            : format(startDate, "MMM d, yyyy");

    return (
        <Dropdown
            open={open}
            onClose={() => {
                if (pendingFrom) {
                    finalize(pendingFrom, pendingFrom);
                    setPendingFrom(undefined);
                }
                setOpen(false);
            }}
        >
            <div ref={triggerRef}>
                <FieldTrigger
                    label={label}
                    value={display}
                    placeholder={placeholder}
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    open={open}
                    onClick={() => setOpen((v) => !v)}
                />
            </div>
            {open && (
                <Popup anchorRef={triggerRef} placement={placement} matchWidth={false}>
                    <DayPicker
                        mode="range"
                        selected={range}
                        onSelect={(r) => {
                            if (!r?.from) {
                                setPendingFrom(undefined);
                                onChange(undefined);
                                return;
                            }
                            if (!r.to) {
                                setPendingFrom(r.from);
                                onChange({ from: r.from, to: r.from });
                                return;
                            }
                            setPendingFrom(undefined);
                            finalize(r.from, r.to);
                            setOpen(false);
                        }}
                        disabled={{ before: min }}
                        classNames={{
                            ...DAY_PICKER_CLASS_NAMES,
                            range_start:
                                "[&_button]:!bg-aleet-gold [&_button]:!text-aleet-text [&_button]:!font-bold [&_button]:!rounded-lg",
                            range_middle:
                                "[&_button]:!bg-aleet-gold/15 [&_button]:!text-aleet-text [&_button]:!rounded-none",
                            range_end:
                                "[&_button]:!bg-aleet-gold [&_button]:!text-aleet-text [&_button]:!font-bold [&_button]:!rounded-lg",
                        }}
                        components={{
                            Chevron: ({ orientation }) =>
                                orientation === "left" ? (
                                    <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                                ),
                        }}
                    />
                    <div className="border-t border-aleet-border px-3.5 py-2.5">
                        <p className="text-[11px] leading-relaxed text-aleet-text-muted">
                            {pendingFrom && !isMultiDay
                                ? "Click a second date for multi-day, or click outside to keep one day."
                                : "One date uses duration (hrs). Multiple dates switch to drop-off time."}
                        </p>
                        {pendingFrom ? (
                            <button
                                type="button"
                                onClick={() => {
                                    finalize(pendingFrom, pendingFrom);
                                    setPendingFrom(undefined);
                                    setOpen(false);
                                }}
                                className="mt-2 w-full rounded-lg bg-aleet-gold px-3 py-1.5 text-[12px] font-semibold text-aleet-text transition-opacity hover:opacity-90"
                            >
                                Use single day
                            </button>
                        ) : null}
                    </div>
                </Popup>
            )}
        </Dropdown>
    );
}

const DAY_PICKER_CLASS_NAMES = {
    root: "p-4 select-none w-[280px]",
    month_caption: "relative flex items-center justify-center mb-2 h-8",
    caption_label: "text-[13px] font-semibold tracking-wide text-aleet-text",
    nav: "absolute inset-x-0 top-0 flex items-center justify-between h-8 pointer-events-none",
    button_previous:
        "flex h-7 w-7 items-center justify-center rounded-lg text-aleet-text-subtle hover:bg-aleet-cream hover:text-aleet-gold transition-colors pointer-events-auto mt-8",
    button_next:
        "flex h-7 w-7 items-center justify-center rounded-lg text-aleet-text-subtle hover:bg-aleet-cream hover:text-aleet-gold transition-colors pointer-events-auto mt-8",
    weekdays: "grid grid-cols-7 mb-2",
    weekday: "text-center text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle py-1",
    weeks: "space-y-1",
    week: "grid grid-cols-7 gap-0.5",
    day: "flex items-center justify-center",
    day_button:
        "h-9 w-9 rounded-lg text-[13px] font-medium text-aleet-text-muted hover:bg-aleet-cream hover:text-aleet-text transition-all duration-150",
    selected:
        "[&_button]:!bg-aleet-gold [&_button]:!text-aleet-text [&_button]:!font-bold [&_button]:!rounded-lg [&_button]:shadow-[0_0_12px_rgba(197,163,134,0.35)]",
    today: "text-aleet-gold font-semibold ring-1 ring-aleet-gold/30 rounded-lg",
    disabled: "opacity-20 cursor-not-allowed pointer-events-none",
    outside: "opacity-20",
};
