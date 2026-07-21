"use client";

import { useEffect, useRef, useState } from "react";
import {
  createAutocompleteSessionToken,
  fetchAddressSuggestions,
  type AddressSuggestion,
} from "@/lib/api/maps";

const DEFAULT_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

type UseDebouncedAddressSuggestionsOptions = {
  debounceMs?: number;
  /** US state code (e.g. OH) — biases Places results to that state. */
  regionCode?: string;
};

/**
 * Debounced Places autocomplete — waits for typing to pause before calling the backend.
 */
export function useDebouncedAddressSuggestions(
  query: string,
  {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    regionCode,
  }: UseDebouncedAddressSuggestionsOptions = {},
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef(createAutocompleteSessionToken());
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setFetchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setFetchError(null);

    const timer = setTimeout(() => {
      const requestId = ++requestIdRef.current;

      void fetchAddressSuggestions(trimmed, sessionTokenRef.current, {
        regionCode: regionCode?.trim() || undefined,
      })
        .then((results) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(results);
          setFetchError(null);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setFetchError(
            "Address search unavailable. Places API (New) must be enabled on the server key.",
          );
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsSearching(false);
          }
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [query, debounceMs, regionCode]);

  function resetSessionToken() {
    sessionTokenRef.current = createAutocompleteSessionToken();
  }

  function clearSuggestions() {
    setSuggestions([]);
    setFetchError(null);
    setIsSearching(false);
  }

  return {
    suggestions,
    fetchError,
    isSearching,
    resetSessionToken,
    clearSuggestions,
  };
}
