"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input, toast } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    isLoading: boolean;
    onSubmit: (value: string) => void;
}

export function IdentifierStep({ isLoading, onSubmit }: Props) {
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
                type="text"
                name="identifier"
                placeholder="+1234567890"
                required
                autoFocus
                autoComplete="username"
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

            <Link
                href="/login/forgot-password"
                className="mb-4 text-center text-[13px] font-semibold text-[#bca066] hover:underline"
            >
                Forgot password?
            </Link>

            <p className="text-center text-[12px] text-[#5a6a6a] sm:text-[13px]">
                By continuing you agree to our{" "}
                <Link
                    href="#"
                    className="text-[#9ba0a1] underline underline-offset-2 hover:text-white"
                >
                    Terms &amp; Conditions
                </Link>
            </p>
        </motion.form>
    );
}
