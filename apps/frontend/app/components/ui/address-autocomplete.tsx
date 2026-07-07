"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AddressSuggestion } from "@/lib/api/maps";
import { useDebouncedAddressSuggestions } from "@/lib/hooks/use-debounced-address-suggestions";

export type PlaceValue = {
    text: string;
    placeId: string;
};

interface AddressAutocompleteProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    onPlaceChange?: (place: PlaceValue) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function AddressAutocomplete({
    label,
    value,
    onChange,
    onPlaceChange,
    placeholder = "Enter address",
    disabled,
    className,
}: AddressAutocompleteProps) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(value);
    const [focused, setFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { suggestions, fetchError, isSearching, resetSessionToken } =
        useDebouncedAddressSuggestions(inputValue);

    const showDropdown = focused && suggestions.length > 0;

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setFocused(false);
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    function handleInput(text: string) {
        setInputValue(text);
        onChange(text);
    }

    function handleSelect(suggestion: AddressSuggestion) {
        setInputValue(suggestion.text);
        onChange(suggestion.text);
        onPlaceChange?.({ text: suggestion.text, placeId: suggestion.placeId });
        setFocused(false);
        inputRef.current?.blur();
        resetSessionToken();
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {label && (
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-aleet-text-subtle">
                    {label}
                </p>
            )}
            <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aleet-gold/50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                        <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
                        <circle cx="12" cy="11" r="2.5" />
                    </svg>
                </span>
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => setFocused(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border border-aleet-border-strong bg-aleet-card pl-9 pr-3 text-[13px] text-aleet-text placeholder:text-aleet-text-subtle outline-none transition-colors focus:border-aleet-gold/50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:text-[14px]"
                />
                {isSearching && inputValue.trim().length >= 2 && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-aleet-text-subtle">
                        …
                    </span>
                )}
            </div>

            {fetchError && (
                <p className="mt-1 text-[11px] text-amber-700/90">{fetchError}</p>
            )}

            {showDropdown && (
                <ul
                    role="listbox"
                    className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-aleet-border bg-aleet-card shadow-[0_8px_32px_rgba(26,21,16,0.12)]"
                >
                    {suggestions.map((s) => (
                        <li
                            key={s.placeId}
                            role="option"
                            aria-selected={false}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                handleSelect(s);
                            }}
                            className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-aleet-gold/8 not-last:border-b not-last:border-aleet-border"
                        >
                            <span className="mt-0.5 shrink-0 text-aleet-gold/50">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                                    <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
                                    <circle cx="12" cy="11" r="2.5" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] text-aleet-text">{s.mainText}</p>
                                <p className="truncate text-[11px] text-aleet-text-subtle">{s.secondaryText}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
