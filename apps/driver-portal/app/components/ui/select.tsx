"use client";

import { useState, useRef } from "react";
import { Dropdown, FieldTrigger, Popup } from "./dropdown";

export type SelectOption = {
    label: string;
    price?: string;
};

export function Select({
    label,
    placeholder,
    icon,
    options,
    value,
    onChange,
    placement = "bottom",
}: {
    label: string;
    placeholder: string;
    icon: React.ReactNode;
    options: SelectOption[];
    value: string;
    onChange: (v: string) => void;
    placement?: "top" | "bottom";
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    return (
        <Dropdown open={open} onClose={() => setOpen(false)}>
            <div ref={triggerRef}>
                <FieldTrigger
                    label={label}
                    value={value}
                    placeholder={placeholder}
                    icon={icon}
                    open={open}
                    onClick={() => setOpen((v) => !v)}
                />
            </div>
            {open && (
                <Popup anchorRef={triggerRef} placement={placement}>
                    <div className="py-1.5">
                        {options.map((opt) => {
                            const display = opt.price ? `${opt.label} ${opt.price}` : opt.label;
                            const selected = value === display;
                            return (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => {
                                        onChange(display);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-4 py-2.5 text-[13px] transition-colors ${selected
                                        ? "bg-[#1e2a1a] text-[#bca066]"
                                        : "text-[#c8d4d6] hover:bg-[#1a2224] hover:text-white"
                                        }`}
                                >
                                    <span>{opt.label}</span>
                                    {opt.price && (
                                        <span className={`text-[12px] ${selected ? "text-[#bca066]" : "text-[#5a7060]"}`}>
                                            {opt.price}
                                        </span>
                                    )}
                                    {selected && (
                                        <span className="ml-2 h-1.5 w-1.5 rounded-full bg-[#bca066]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Popup>
            )}
        </Dropdown>
    );
}
