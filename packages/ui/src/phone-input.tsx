"use client";

import PhoneInputLib, { type Country } from "react-phone-number-input";
import { cn } from "@aleet/shared";

type PhoneInputProps = {
    value: string;
    onChange: (value: string) => void;
    /**
     * Country whose dial code is pre-selected. Required because the two Aleet
     * apps target different default markets — pass it explicitly at the call site.
     */
    defaultCountry: Country;
    className?: string;
    required?: boolean;
    placeholder?: string;
};

export function PhoneInput({
    value,
    onChange,
    defaultCountry,
    className,
    required,
    placeholder,
}: PhoneInputProps) {
    return (
        <PhoneInputLib
            international
            defaultCountry={defaultCountry}
            value={value}
            onChange={(v) => onChange(v ?? "")}
            placeholder={placeholder ?? "Phone number"}
            numberInputProps={{
                required,
            }}
            className={cn("phone-input-wrapper", className)}
        />
    );
}
