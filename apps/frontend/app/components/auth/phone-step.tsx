"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    isLoading: boolean;
    onSubmit: (phone: string) => void;
    onBack: () => void;
}

export function PhoneStep({ isLoading, onSubmit, onBack }: Props) {
    const [value, setValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    };

    return (
        <motion.form {...fadeProps} className="flex flex-col" onSubmit={handleSubmit}>
            <Input
                type="tel"
                name="phone"
                placeholder="+1234567890"
                required
                autoFocus
                autoComplete="tel"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mb-5 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-14 sm:text-[17px]"
            />

            <Button
                className="mb-4 h-13 text-[17px] sm:h-14.5 sm:text-[21px]"
                type="submit"
                isLoading={isLoading}
            >
                Continue
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
