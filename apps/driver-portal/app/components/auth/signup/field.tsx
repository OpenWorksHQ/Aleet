import React from "react";

interface FieldProps {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">
                {label} {required && <span className="text-gold">*</span>}
            </label>
            {children}
        </div>
    );
}
