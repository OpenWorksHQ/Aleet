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
                className="mb-4 h-[50px] px-4 text-[15px] sm:h-[56px] sm:text-[17px]"
            />
            <Input
                type="password"
                name="confirm"
                placeholder="Confirm password"
                required
                minLength={8}
                className="mb-5 h-[50px] px-4 text-[15px] sm:h-[56px] sm:text-[17px]"
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
                className="text-center text-[13px] font-semibold text-aleet-text-muted transition-colors hover:text-aleet-text"
            >
                ← Back
            </button>
        </motion.form>
    );
}
