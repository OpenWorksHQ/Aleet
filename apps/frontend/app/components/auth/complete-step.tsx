"use client";

import { motion } from "framer-motion";
import { Button, Input } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    isLoading: boolean;
    defaultEmail?: string;
    onSubmit: (name: string, email: string) => void;
    onBack: () => void;
}

export function CompleteStep({ isLoading, defaultEmail = "", onSubmit, onBack }: Props) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
        const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
        onSubmit(name, email);
    };

    return (
        <motion.form {...fadeProps} className="flex flex-col" onSubmit={handleSubmit}>
            <Input
                type="text"
                name="name"
                placeholder="Your full name"
                required
                autoFocus
                autoComplete="name"
                className="mb-4 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-14 sm:text-[17px]"
            />
            <Input
                type="email"
                name="email"
                placeholder="Email"
                required
                autoComplete="email"
                defaultValue={defaultEmail}
                className="mb-5 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-14 sm:text-[17px]"
            />
            <Button
                className="mb-4 h-13 text-[17px] sm:h-14.5 sm:text-[21px]"
                type="submit"
                isLoading={isLoading}
            >
                Create Account
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
