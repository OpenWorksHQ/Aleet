"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ConfirmVariant = "default" | "danger" | "success";

interface ConfirmModalProps {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    variant?: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
}

const confirmButtonStyles: Record<ConfirmVariant, string> = {
    default:
        "border-gold/30 bg-gold/15 text-gold hover:border-gold hover:bg-gold/25",
    danger:
        "border-red-500/30 bg-red-500/15 text-red-400 hover:border-red-500 hover:bg-red-500/20",
    success:
        "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/20",
};

export function ConfirmModal({
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isLoading = false,
    variant = "default",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card-bg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <h3 className="mb-2 text-base font-bold text-text">{title}</h3>
                {description && (
                    <p className="mb-5 text-sm leading-relaxed text-muted">{description}</p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:border-gold/30 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "flex-1 inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                            confirmButtonStyles[variant],
                        )}
                    >
                        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
