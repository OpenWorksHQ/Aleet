"use client";

import { motion } from "framer-motion";
import { Button, Input, toast } from "@/app/components/ui";
import { fadeProps } from "./fade-props";

interface Props {
    isLoading: boolean;
    onSubmit: (password: string) => void;
    onBack: () => void;
}

export function PasscodeStep({ isLoading, onSubmit, onBack }: Props) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;
        const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;
        if (password !== confirm) {
            toast.error("Passwords do not match.");
            return;
        }
        onSubmit(password);
    };

    return (
        <motion.form {...fadeProps} className="flex flex-col" onSubmit={handleSubmit}>
            <Input
                type="password"
                name="password"
                placeholder="Password (min. 8 characters)"
                required
                minLength={8}
                autoFocus
                className="mb-4 h-[50px] border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-[56px] sm:text-[17px]"
            />
            <Input
                type="password"
                name="confirm"
                placeholder="Confirm password"
                required
                minLength={8}
                className="mb-5 h-[50px] border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-[56px] sm:text-[17px]"
            />
            <Button
                className="mb-4 h-[52px] text-[17px] sm:h-[58px] sm:text-[21px]"
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
