"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";

// New Places API type (available since March 2025)
type Suggestion = google.maps.places.AutocompleteSuggestion;

export type PlaceValue = {
    text: string;
    placeId: string;
};

interface AddressAutocompleteProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    /** Called when user selects a suggestion — provides placeId + text */
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
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const placesLib = useMapsLibrary("places");
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Sync external value → local input
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Create session token once places lib is ready
    useEffect(() => {
        if (placesLib && !sessionTokenRef.current) {
            sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
    }, [placesLib]);

    // Close dropdown on outside click
    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    async function handleInput(text: string) {
        setInputValue(text);
        onChange(text);

        if (!placesLib || text.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        // Cancel previous in-flight request
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        try {
            const { suggestions: results } =
                await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: text,
                    sessionToken: sessionTokenRef.current ?? undefined,
                });

            setSuggestions(results);
            setOpen(results.length > 0);
        } catch {
            // Aborted or network error — ignore
        }
    }

    function handleSelect(suggestion: Suggestion) {
        const address = suggestion.placePrediction?.text?.toString() ?? "";
        const placeId = suggestion.placePrediction?.placeId ?? "";
        setInputValue(address);
        onChange(address);
        onPlaceChange?.({ text: address, placeId });
        setSuggestions([]);
        setOpen(false);
        inputRef.current?.blur();

        // Refresh session token after selection
        if (placesLib) {
            sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
    }

    // Main text / secondary text from the new API
    function getMainText(s: Suggestion) {
        return s.placePrediction?.mainText?.toString() ?? s.placePrediction?.text?.toString() ?? "";
    }

    function getSecondaryText(s: Suggestion) {
        return s.placePrediction?.secondaryText?.toString() ?? "";
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {label && (
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-[#7a8a9a]">
                    {label}
                </p>
            )}
            <div className="relative">
                {/* Pin icon */}
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#bca066]/50">
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
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border border-[#2e3638] bg-[#1e2527] pl-9 pr-3 text-[13px] text-white placeholder:text-[#5a6870] outline-none transition-colors focus:border-[#bca066]/40 focus:bg-[#1e2a1a] disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:text-[14px]"
                />
            </div>

            {/* Suggestions dropdown */}
            {open && suggestions.length > 0 && (
                <ul
                    role="listbox"
                    className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#2e3638] bg-[#0e1a19] shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                >
                    {suggestions.map((s, i) => (
                        <li
                            key={s.placePrediction?.placeId ?? i}
                            role="option"
                            aria-selected={false}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                handleSelect(s);
                            }}
                            className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#bca066]/8 not-last:border-b not-last:border-[#1e2a2c]"
                        >
                            <span className="mt-0.5 shrink-0 text-[#bca066]/40">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                                    <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
                                    <circle cx="12" cy="11" r="2.5" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] text-white/90">{getMainText(s)}</p>
                                <p className="truncate text-[11px] text-white/35">{getSecondaryText(s)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
