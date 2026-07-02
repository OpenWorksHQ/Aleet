"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export function Dropdown({
    open,
    onClose,
    children,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (ref.current && ref.current.contains(e.target as Node)) return;
            if ((e.target as HTMLElement).closest("[data-dropdown-popup]")) return;
            onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, onClose]);

    return (
        <div ref={ref} className="relative">
            {children}
        </div>
    );
}

export function FieldTrigger({
    label,
    value,
    placeholder,
    icon,
    open,
    onClick,
}: {
    label: string;
    value: string;
    placeholder: string;
    icon: React.ReactNode;
    open: boolean;
    onClick: () => void;
}) {
    return (
        <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-aleet-text-subtle">
                {label}
            </p>
            <button
                type="button"
                onClick={onClick}
                className={`inline-flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-[13px] transition-all duration-200 sm:h-12 sm:text-[14px] ${open
                    ? "border-aleet-gold/60 bg-aleet-card text-aleet-text shadow-[0_0_0_1px_rgba(197,163,134,0.2)]"
                    : value
                        ? "border-aleet-border-strong bg-aleet-card text-aleet-text hover:border-aleet-gold/30"
                        : "border-aleet-border bg-aleet-cream-muted text-aleet-text-subtle hover:border-aleet-border-strong"
                    }`}
            >
                <span className="text-aleet-gold/80">{icon}</span>
                <span className="flex-1 text-left">{value || placeholder}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 text-aleet-text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>
        </div>
    );
}

export function Popup({
    anchorRef,
    children,
    placement = "bottom",
    matchWidth = true,
}: {
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    placement?: "top" | "bottom";
    matchWidth?: boolean;
}) {
    const popupRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; minWidth: number } | null>(null);
    const [visible, setVisible] = useState(false);

    function measure() {
        const anchor = anchorRef.current;
        const popup = popupRef.current;
        if (!anchor || !popup) return;

        const r = anchor.getBoundingClientRect();
        const popupHeight = popup.offsetHeight;
        const popupWidth = matchWidth ? r.width : popup.scrollWidth;
        const maxLeft = window.innerWidth - popupWidth - 8;
        const left = Math.min(r.left, maxLeft);

        setCoords({
            top: placement === "top"
                ? r.top - popupHeight - 8
                : r.bottom + 8,
            left: Math.max(8, left),
            width: matchWidth ? r.width : popupWidth,
            minWidth: r.width,
        });
    }

    useEffect(() => {
        measure();
        let raf1: number;
        let raf2: number;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setVisible(true));
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", measure, true);
        window.addEventListener("resize", measure);
        return () => {
            window.removeEventListener("scroll", measure, true);
            window.removeEventListener("resize", measure);
        };
    }, [anchorRef, placement, matchWidth]);

    return createPortal(
        <div
            ref={popupRef}
            data-dropdown-popup=""
            style={coords
                ? { top: coords.top, left: coords.left, width: coords.width, minWidth: coords.minWidth }
                : { top: -9999, left: -9999, width: 0, minWidth: 0 }
            }
            className={`fixed z-9999 overflow-hidden rounded-xl border border-aleet-border bg-aleet-card shadow-[0_16px_48px_rgba(26,21,16,0.12)] transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
        >
            {children}
        </div>,
        document.body,
    );
}
