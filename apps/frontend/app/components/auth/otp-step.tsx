"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    identifier: string;
    isLoading: boolean;
    onSubmit: (code: string) => void;
    onBack: () => void;
}

export function OtpStep({ identifier, isLoading, onSubmit, onBack }: Props) {
    const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
    const isComplete = otp.every((d) => d.length === 1);

    const update = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        setOtp((prev) => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        if (digit && index < 5) {
            (document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null)?.focus();
        }
    };

    const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            (document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null)?.focus();
        }
    };

    const onPaste = (e: React.ClipboardEvent) => {
        const digits = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6)
            .split("");
        if (digits.length <= 1) return;
        e.preventDefault();
        setOtp((prev) => {
            const next = [...prev];
            for (let i = 0; i < 6; i++) next[i] = digits[i] ?? "";
            return next;
        });
        (
            document.getElementById(
                `otp-${Math.min(digits.length, 5)}`,
            ) as HTMLInputElement | null
        )?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(otp.join(""));
    };

    return (
        <motion.form {...fadeProps} className="flex flex-col" onSubmit={handleSubmit}>
            <p className="mb-6 text-center text-[14px] text-[#a3a8a7]">
                Code sent to{" "}
                <span className="font-semibold text-white">{identifier}</span>
            </p>
            <div className="mb-6 grid grid-cols-6 gap-2.5 sm:gap-3.5">
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        id={`otp-${i}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => update(i, e.target.value)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        onPaste={onPaste}
                        className={cn(
                            "h-13.5 w-full rounded-lg border border-[#1e2125] bg-[#090c0e] text-center text-[20px] font-semibold text-white outline-none transition-colors focus:border-[#3f4349] sm:h-16 sm:text-[24px]",
                            digit && "border-[#414a4d]",
                        )}
                        aria-label={`Digit ${i + 1}`}
                    />
                ))}
            </div>
            <Button
                className="mb-4 h-13 text-[17px] sm:h-14.5 sm:text-[21px]"
                type="submit"
                isLoading={isLoading}
                disabled={!isComplete}
            >
                Verify Code
            </Button>
            <button
                type="button"
                onClick={onBack}
                className="text-center text-[13px] font-semibold text-[#9ba0a1] transition-colors hover:text-white"
            >
                ← Back
            </button>
        </motion.form>
    );
}
