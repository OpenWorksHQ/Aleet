"use client";

import { motion } from "framer-motion";
import { Button, Input } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    identifier: string;
    isLoading: boolean;
    onSubmit: (password: string) => void;
    onBack: () => void;
}

export function PasswordStep({ identifier, isLoading, onSubmit, onBack }: Props) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const password = (
            e.currentTarget.elements.namedItem("password") as HTMLInputElement
        ).value;
        onSubmit(password);
    };

    return (
        <motion.form {...fadeProps} className="flex flex-col" onSubmit={handleSubmit}>
            <p className="mb-5 rounded-lg border border-[#1e2b2c] bg-[#090c0e] px-4 py-3 text-[14px] text-[#a3a8a7]">
                {identifier}
            </p>
            <Input
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                autoFocus
                className="mb-5 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-14 sm:text-[17px]"
            />
            <Button
                className="mb-4 h-13 text-[17px] sm:h-14.5 sm:text-[21px]"
                type="submit"
                isLoading={isLoading}
            >
                Log In
            </Button>
            <div className="flex items-center justify-center text-[13px] font-semibold">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[#9ba0a1] transition-colors hover:text-white"
                >
                    ← Back
                </button>
            </div>
        </motion.form>
    );
}
