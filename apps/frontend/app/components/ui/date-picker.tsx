"use client";

import { useState, useRef } from "react";
import { DayPicker } from "react-day-picker";
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
                        classNames={{
                            root: "p-4 select-none w-[280px]",
                            month_caption: "relative flex items-center justify-center mb-2 h-8",
                            caption_label: "text-[13px] font-semibold tracking-wide text-white",
                            nav: "absolute inset-x-0 top-0 flex items-center justify-between h-8 pointer-events-none",
                            button_previous:
                                "flex h-7 w-7 items-center justify-center rounded-lg text-[#5a7080] hover:bg-[#1e2a2c] hover:text-[#bca066] transition-colors pointer-events-auto mt-8",
                            button_next:
                                "flex h-7 w-7 items-center justify-center rounded-lg text-[#5a7080] hover:bg-[#1e2a2c] hover:text-[#bca066] transition-colors pointer-events-auto mt-8",
                            weekdays: "grid grid-cols-7 mb-2",
                            weekday: "text-center text-[11px] font-semibold uppercase tracking-wider text-[#3a5060] py-1",
                            weeks: "space-y-1",
                            week: "grid grid-cols-7 gap-0.5",
                            day: "flex items-center justify-center",
                            day_button:
                                "h-9 w-9 rounded-lg text-[13px] font-medium text-[#a0b4bc] hover:bg-[#1a2830] hover:text-white transition-all duration-150 rdp-selected:bg-[#bca066] rdp-selected:text-[#0a0a00] rdp-selected:font-bold",
                            selected:
                                "[&_button]:!bg-[#bca066] [&_button]:!text-[#0a0a00] [&_button]:!font-bold [&_button]:!rounded-lg [&_button]:shadow-[0_0_12px_rgba(188,160,102,0.5)]",
                            today: "text-[#bca066] font-semibold ring-1 ring-[#bca066]/30 rounded-lg",
                            disabled: "opacity-20 cursor-not-allowed pointer-events-none",
                            outside: "opacity-20",
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
                </Popup>
            )}
        </Dropdown>
    );
}
