"use client";

import { useRef } from "react";
import { Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadAreaProps {
    label: string;
    hint: string;
    file: File | null;
    onChange: (f: File | null) => void;
    required?: boolean;
}

export function FileUploadArea({ label, hint, file, onChange, required }: FileUploadAreaProps) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center gap-1.5">
            {label && (
                <span className="text-sm font-medium text-text">
                    {label} {required && <span className="text-gold">*</span>}
                </span>
            )}
            <button
                type="button"
                onClick={() => ref.current?.click()}
                className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-6 transition-colors",
                    file
                        ? "border-gold/50 bg-gold/5"
                        : "border-border hover:border-gold/40 hover:bg-gold/5",
                )}
            >
                {file ? (
                    <>
                        <Check className="h-5 w-5 text-gold" />
                        <span className="max-w-35 truncate text-xs text-gold">{file.name}</span>
                    </>
                ) : (
                    <>
                        <Upload className="h-5 w-5 text-muted" />
                        <span className="text-xs text-muted">Click to upload</span>
                    </>
                )}
            </button>
            <span className="text-[11px] text-muted">{hint}</span>
            <input
                ref={ref}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
        </div>
    );
}
