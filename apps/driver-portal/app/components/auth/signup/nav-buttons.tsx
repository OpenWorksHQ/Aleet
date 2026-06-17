"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavButtonsProps {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    loading?: boolean;
    hideBack?: boolean;
}

export function NavButtons({ onBack, onNext, nextLabel = "Next", loading, hideBack }: NavButtonsProps) {
    return (
        <div className="flex items-center justify-between pt-2">
            <button
                type="button"
                onClick={onBack}
                disabled={hideBack}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-gold/40 hover:text-gold",
                    hideBack && "invisible",
                )}
            >
                ← Previous
            </button>
            <button
                type={onNext ? "button" : "submit"}
                onClick={onNext}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {nextLabel} →
            </button>
        </div>
    );
}
