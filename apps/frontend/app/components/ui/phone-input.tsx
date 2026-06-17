"use client";

import PhoneInputLib from "react-phone-number-input";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
    placeholder?: string;
};

export function PhoneInput({ value, onChange, className, required, placeholder }: PhoneInputProps) {
    return (
        <PhoneInputLib
            international
            defaultCountry="GB"
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
