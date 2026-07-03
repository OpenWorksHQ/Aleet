"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import {
  isPickupTimeDisabled,
  slotFromTimeStr,
  combineDateAndTime,
} from "@/lib/booking-constraints";
import {
  loadPartnerContext,
  clearPartnerContext,
  savePartnerContext,
  PARTNER_CHANGED_EVENT,
} from "@/lib/partner/attribution";
import { hydratePartnerContext } from "@/lib/partner/hydrate";
import { validatePartnerCode } from "@/lib/api/partners";
import { estimateRoute } from "@/lib/partner/route-estimate";
import { filterVehiclesByPartner } from "@/lib/partner/venue-access";
import type { PartnerContext } from "@/lib/partner/types";
import type { SelectOption } from "../ui/select";

type VehicleOption = SelectOption & { _id: string; hourlyPrice: number };
type RegionOption = SelectOption & { _id: string };

type BuyHoursPayload = {
  pickupDate: Date;
  pickupTime: string;
  dropoffDate: Date;
  dropoffTime: string;
  durationHours: number;
  vehicleDisplay: string;
  regionDisplay: string;
  dropoffLocation: { text: string; placeId: string };
  promoCode?: string;
};

type BuyHoursBookingFormProps = {
  vehicleList: VehicleOption[];
  regionList: RegionOption[];
  vehicleValue: string;
  stateValue: string;
  isMember?: boolean;
  onVehicleChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onContinue: (payload: BuyHoursPayload) => void;
};

const LAST_REGION_KEY = "lastBookingRegion";

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function findNearestValidTime(date: Date, isMember = false): string {
  const hours = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );
  const minutes = ["00", "15", "30", "45"];
  for (const period of ["AM", "PM"] as const) {
    for (const hour of hours) {
      for (const minute of minutes) {
        const time = `${hour}:${minute} ${period}`;
        if (!isPickupTimeDisabled(date, slotFromTimeStr(time), isMember)) {
          return time;
        }
      }
    }
  }
  return "12:00 AM";
}

function pickDefaultVehicle(list: VehicleOption[]): string {
  const suv = list.find((v) => v.label.toLowerCase() === "suv");
  const first = suv ?? list[0];
  if (!first) return "";
  return first.price ? `${first.label} ${first.price}` : first.label;
}

function pickDefaultRegion(list: RegionOption[]): string {
  return list[0]?.label ?? "";
}

function pickSavedRegion(list: RegionOption[]): string | null {
  try {
    const last = window.localStorage.getItem(LAST_REGION_KEY);
    if (last && list.some((r) => r.label === last)) return last;
    const tz = Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone.toLowerCase()
      .split("/")
      .join(" ");
    const byTz = list.find((r) => tz.includes(r.label.toLowerCase()));
    if (byTz) return byTz.label;
  } catch {
    /* SSR guard */
  }
  return null;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const period = h < 12 ? "AM" : "PM";
      slots.push(
        `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`,
      );
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export function BuyHoursBookingForm({
  vehicleList,
  regionList,
  vehicleValue,
  stateValue,
  isMember = false,
  onVehicleChange,
  onStateChange,
  onContinue,
}: BuyHoursBookingFormProps) {
  const today = useMemo(() => todayStart(), []);
  const [dropoffText, setDropoffText] = useState("");
  const [dropoffPlaceId, setDropoffPlaceId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [durationHours, setDurationHours] = useState(3);
  const [dropoffTime, setDropoffTime] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [partnerLabel, setPartnerLabel] = useState<string | null>(null);
  const [partnerContext, setPartnerContext] = useState<PartnerContext | null>(null);
  const [routeMiles, setRouteMiles] = useState<number | null>(null);
  const [routeDistanceText, setRouteDistanceText] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);

  const isVenueAccess = partnerContext?.bookingMode === "venue_access";
  const venuePickup = partnerContext?.pickupLocation;

  const filteredVehicleList = useMemo(
    () => filterVehiclesByPartner(vehicleList, partnerContext?.allowedVehicleTypeIds),
    [vehicleList, partnerContext?.allowedVehicleTypeIds],
  );

  const isMultiDay = !!(
    startDate &&
    endDate &&
    startDate.getTime() !== endDate.getTime()
  );
  const minHours = isMember ? 1 : 3;

  const vehicle = vehicleValue || pickDefaultVehicle(filteredVehicleList);
  const state = stateValue || pickDefaultRegion(regionList);

  useEffect(() => {
    if (!stateValue && regionList.length > 0) {
      const saved = pickSavedRegion(regionList);
      if (saved) onStateChange(saved);
    }
  }, [regionList, stateValue, onStateChange]);

  useEffect(() => {
    if (!state) return;
    try {
      window.localStorage.setItem(LAST_REGION_KEY, state);
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    const applyPartner = (partner: PartnerContext | null) => {
      if (cancelled) return;
      if (!partner) {
        setPartnerLabel(null);
        setPartnerContext(null);
        setPromoCode("");
        setRouteMiles(null);
        setRouteDistanceText("");
        return;
      }
      setPartnerLabel(partner.partnerName);
      setPartnerContext(partner);
      setPromoCode((prev) => prev || partner.partnerCode);
      if (partner.bookingMode === "venue_access" && !startDate) {
        setStartDate(today);
        setEndDate(today);
      }
    };

    const syncPartner = async () => {
      const partner = await hydratePartnerContext();
      applyPartner(partner);
    };

    void syncPartner();
    window.addEventListener(PARTNER_CHANGED_EVENT, syncPartner);
    return () => {
      cancelled = true;
      window.removeEventListener(PARTNER_CHANGED_EVENT, syncPartner);
    };
  }, [startDate, today]);

  const handlePromoChange = useCallback((value: string) => {
    const code = value.toUpperCase();
    setPromoCode(code);
    if (!code.trim() && loadPartnerContext()) {
      clearPartnerContext();
    }
  }, []);

  useEffect(() => {
    const code = promoCode.trim();
    if (!code || code.length < 3) return;

    const timer = setTimeout(async () => {
      const res = await validatePartnerCode(code);
      if (res.data) {
        savePartnerContext(res.data);
        setPartnerContext(res.data);
        setPartnerLabel(res.data.partnerName);
        if (res.data.bookingMode === "venue_access" && !startDate) {
          setStartDate(today);
          setEndDate(today);
        }
        return;
      }

      if (loadPartnerContext()) {
        clearPartnerContext();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [promoCode, startDate, today]);

  useEffect(() => {
    if (!isVenueAccess || !venuePickup?.text || !dropoffPlaceId || !dropoffText) {
      setRouteMiles(null);
      setRouteDistanceText("");
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    void estimateRoute(venuePickup, { text: dropoffText, placeId: dropoffPlaceId }).then(
      (estimate) => {
        if (cancelled) return;
        if (estimate) {
          setRouteMiles(estimate.distanceMiles);
          setRouteDistanceText(estimate.distanceText);
        }
        setRouteLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isVenueAccess, venuePickup, dropoffPlaceId, dropoffText]);

  const handleDateSelect = useCallback((range: DateRange | undefined) => {
    if (!range?.from) {
      setStartDate(undefined);
      setEndDate(undefined);
      setDropoffTime("");
      return;
    }
    const nextEnd = range.to ?? range.from;
    const multiDay = nextEnd.getTime() !== range.from.getTime();
    setStartDate(range.from);
    setEndDate(nextEnd);
    setDropoffTime((prev) => (multiDay ? prev || "12:00 PM" : ""));
  }, []);

  const isValid = isVenueAccess
    ? !!startDate && !!dropoffText && !!dropoffPlaceId && !!vehicle && !!state
    : !!startDate &&
      !!dropoffText &&
      !!vehicle &&
      !!state &&
      (isMultiDay ? !!dropoffTime : durationHours >= minHours);

  const handleContinue = useCallback(() => {
    if (!isValid || !startDate) return;

    const pickupDate = startDate;
    const pickupTime = findNearestValidTime(pickupDate, isMember);

    let computedDropoffDate: Date;
    let computedDropoffTime: string;

    if (isMultiDay && endDate) {
      computedDropoffDate = endDate;
      computedDropoffTime = dropoffTime || "12:00 PM";
    } else {
      const start = combineDateAndTime(pickupDate, pickupTime);
      if (!start) return;
      const end = new Date(start.getTime() + durationHours * 3_600_000);
      computedDropoffDate = end;
      const h24 = end.getHours();
      const minute = String(end.getMinutes()).padStart(2, "0");
      const period = h24 >= 12 ? "PM" : "AM";
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      computedDropoffTime = `${String(h12).padStart(2, "0")}:${minute} ${period}`;
    }

    onContinue({
      pickupDate,
      pickupTime,
      dropoffDate: computedDropoffDate,
      dropoffTime: computedDropoffTime,
      durationHours: isMultiDay ? 0 : durationHours,
      vehicleDisplay: vehicle,
      regionDisplay: state,
      dropoffLocation: { text: dropoffText, placeId: dropoffPlaceId },
      promoCode: promoCode || undefined,
    });
  }, [
    isValid,
    startDate,
    endDate,
    dropoffText,
    dropoffPlaceId,
    durationHours,
    dropoffTime,
    vehicle,
    state,
    promoCode,
    isMultiDay,
    isMember,
    onContinue,
  ]);

  const dateDisplay = useMemo(() => {
    if (!startDate) return "";
    if (isMultiDay && endDate) {
      return `${format(startDate, "MMM d")} — ${format(endDate, "MMM d, yyyy")}`;
    }
    return format(startDate, "MMM d, yyyy");
  }, [startDate, endDate, isMultiDay]);

  return (
    <section className="overflow-visible rounded-[20px] lg:mt-7 bg-black shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6 lg:px-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d="M3 14h18" />
              <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
              <circle cx="7.5" cy="16.8" r="1.7" />
              <circle cx="16.5" cy="16.8" r="1.7" />
            </svg>
          </span>
          <span className="text-[14px] font-medium text-white sm:text-[15px]">
            Book Transportation
          </span>
        </div>
        <div className="flex items-center gap-2">
          {partnerLabel ? (
            <span className="hidden max-w-[140px] truncate text-[11px] text-[#c5a386] sm:inline">
              via {partnerLabel}
            </span>
          ) : (
            <span className="hidden text-[11px] text-white/45 sm:inline">
              Promo / Partner Code
            </span>
          )}
          <input
            type="text"
            value={promoCode}
            onChange={(e) => handlePromoChange(e.target.value)}
            placeholder={partnerLabel ? partnerLabel : "Enter code"}
            aria-label="Promo or partner code"
            className="h-8 w-[108px] rounded-md border border-white/15 bg-[#141414] px-2.5 text-[11px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#c5a386]/60 sm:w-[120px] sm:text-[12px]"
          />
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.45fr_0.95fr_0.8fr_1fr_0.8fr_auto] lg:gap-2.5 lg:px-7 lg:pb-6">
        <BarAddress
          label={isVenueAccess ? "Drop-off destination" : undefined}
          value={dropoffText}
          onChange={(v) => {
            setDropoffText(v);
            if (!v) setDropoffPlaceId("");
          }}
          onPlaceSelect={(text, placeId) => {
            setDropoffText(text);
            setDropoffPlaceId(placeId);
          }}
        />

        <BarDateRange
          startDate={startDate}
          endDate={endDate}
          dateDisplay={dateDisplay}
          onSelect={handleDateSelect}
          minDate={today}
        />

        {isMultiDay ? (
          <BarTimeSelect value={dropoffTime} onChange={setDropoffTime} />
        ) : isVenueAccess ? (
          <BarRouteMiles
            miles={routeMiles}
            distanceText={routeDistanceText}
            loading={routeLoading}
          />
        ) : (
          <BarDuration
            value={durationHours}
            onChange={setDurationHours}
            min={minHours}
          />
        )}

        {!isVenueAccess ? (
          <>
            <BarSelect
              label="Vehicle Type"
              options={filteredVehicleList}
              value={vehicle}
              onChange={onVehicleChange}
              placeholder="Select vehicle"
              icon="car"
            />

            <BarSelect
              label="State"
              options={regionList}
              value={state}
              onChange={onStateChange}
              placeholder="Select state"
            />
          </>
        ) : (
          <>
            <BarVenueMeta label="Vehicle" value={partnerContext?.vehicleName ?? vehicle.split(" $")[0]} />
            <BarVenueMeta label="Venue Access" value="Route-based pricing" />
          </>
        )}

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            onClick={handleContinue}
            aria-disabled={!isValid}
            className={cn(
              "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#c5a386] px-6 text-[14px] font-semibold text-black transition-all sm:text-[15px]",
              isValid
                ? "cursor-pointer hover:bg-[#b89472]"
                : "cursor-not-allowed opacity-60",
            )}
          >
            Continue
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-1.5 border-t border-white/6 px-5 py-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-3 w-3 text-white/30"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 1 1 8 0v4" />
        </svg>
        <span className="text-[11px] text-white/30">
          Your information is private and secure
        </span>
      </div>
    </section>
  );
}

/* ── Inline sub-components ─────────────────────────────────────────── */

const LABEL = "mb-1.5 text-[12px] font-normal text-white/50";
const FIELD =
  "flex h-[52px] w-full items-center gap-2 rounded-lg border border-white/12 bg-[#141414] px-3 text-[13px] text-white outline-none transition-colors focus-within:border-[#c5a386]/55 sm:text-[14px]";
const FIELD_PLACEHOLDER = "text-white/30";
const FIELD_VALUE = "text-white/90";

type Suggestion = google.maps.places.AutocompleteSuggestion;

function BarAddress({
  value,
  onChange,
  onPlaceSelect,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelect: (text: string, placeId: string) => void;
  label?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const placesLib = useMapsLibrary("places");
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (placesLib && !tokenRef.current)
      tokenRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    function down(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, []);

  async function handleInput(text: string) {
    onChange(text);
    if (!placesLib || text.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const { suggestions: res } =
        await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input: text,
            sessionToken: tokenRef.current ?? undefined,
          },
        );
      setSuggestions(res);
      setOpen(res.length > 0);
    } catch {
      /* ignore */
    }
  }

  function handleSelect(s: Suggestion) {
    const text = s.placePrediction?.text?.toString() ?? "";
    const placeId = s.placePrediction?.placeId ?? "";
    onChange(text);
    onPlaceSelect(text, placeId);
    setSuggestions([]);
    setOpen(false);
    if (placesLib) tokenRef.current = new placesLib.AutocompleteSessionToken();
  }

  return (
    <div ref={containerRef} className="relative">
      <p className={LABEL}>Drop-off Location</p>
      <div className={FIELD}>
        <span className="shrink-0 text-[#c5a373]/70">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Enter drop-off address"
          autoComplete="off"
          className={cn(
            "h-full flex-1 bg-transparent outline-none placeholder:text-white/30",
            FIELD_VALUE,
          )}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 lg:mt-1 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#2a302e] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {suggestions.map((s, i) => {
            const main = s.placePrediction?.mainText?.toString() ?? "";
            const secondary =
              s.placePrediction?.secondaryText?.toString() ?? "";
            return (
              <li
                key={s.placePrediction?.placeId ?? i}
                role="option"
                aria-selected={false}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="flex cursor-pointer items-start gap-2 border-b border-white/6 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/6"
              >
                <span className="mt-0.5 shrink-0 text-[#bca066]/50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M12 21c-4.418-4.418-7-7.582-7-10a7 7 0 1 1 14 0c0 2.418-2.582 5.582-7 10Z" />
                    <circle cx="12" cy="11" r="2.5" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white">{main}</p>
                  {secondary && (
                    <p className="truncate text-[11px] text-white/45">
                      {secondary}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BarDateRange({
  startDate,
  endDate,
  dateDisplay,
  onSelect,
  minDate,
}: {
  startDate: Date | undefined;
  endDate: Date | undefined;
  dateDisplay: string;
  onSelect: (range: DateRange | undefined) => void;
  minDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);

  const finalizeSelection = useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      if (!from) {
        onSelect(undefined);
        return;
      }
      onSelect({ from, to: to ?? from });
    },
    [onSelect],
  );

  useEffect(() => {
    function down(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (pendingFrom) {
          finalizeSelection(pendingFrom, pendingFrom);
          setPendingFrom(undefined);
        }
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [pendingFrom, finalizeSelection]);

  const range: DateRange | undefined = startDate
    ? { from: startDate, to: endDate ?? startDate }
    : undefined;

  const isRangeSelection =
    !!startDate && !!endDate && startDate.getTime() !== endDate.getTime();

  return (
    <div ref={containerRef} className="relative">
      <p className={LABEL}>Date</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD, "cursor-pointer")}
      >
        <span className="shrink-0 text-[#c5a373]/70">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v3M16 3v3M3 10h18" />
          </svg>
        </span>
        <span
          className={cn(
            "flex-1 text-left",
            dateDisplay ? FIELD_VALUE : FIELD_PLACEHOLDER,
          )}
        >
          {dateDisplay || "Select date"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-white/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#2a302e] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={(r) => {
              if (!r?.from) {
                setPendingFrom(undefined);
                onSelect(undefined);
                return;
              }

              if (!r.to) {
                setPendingFrom(r.from);
                onSelect({ from: r.from, to: r.from });
                return;
              }

              setPendingFrom(undefined);
              finalizeSelection(r.from, r.to);
              setOpen(false);
            }}
            disabled={{ before: minDate }}
            classNames={{
              root: "p-3.5 select-none w-[280px]",
              month_caption:
                "relative flex items-center justify-center mb-2 h-8",
              caption_label:
                "text-[13px] font-semibold tracking-wide text-white",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between h-8 pointer-events-none",
              button_previous:
                "flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors pointer-events-auto mt-8",
              button_next:
                "flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors pointer-events-auto mt-8",
              weekdays: "grid grid-cols-7 mb-1",
              weekday:
                "text-center text-[11px] font-semibold uppercase tracking-wider text-white/35 py-1",
              weeks: "space-y-0.5",
              week: "grid grid-cols-7 gap-0.5",
              day: "flex items-center justify-center",
              day_button:
                "h-9 w-9 rounded-lg text-[13px] font-medium text-white/75 hover:bg-white/8 hover:text-white transition-all duration-150",
              selected:
                "[&_button]:!bg-[#bca066] [&_button]:!text-white [&_button]:!font-bold",
              range_start:
                "[&_button]:!bg-[#bca066] [&_button]:!text-white [&_button]:!font-bold [&_button]:!rounded-lg",
              range_middle:
                "[&_button]:!bg-[#bca066]/12 [&_button]:!text-[#7a6840] [&_button]:!rounded-none",
              range_end:
                "[&_button]:!bg-[#bca066] [&_button]:!text-white [&_button]:!font-bold [&_button]:!rounded-lg",
              today: "ring-1 ring-[#bca066]/30 rounded-lg",
              disabled: "opacity-20 cursor-not-allowed pointer-events-none",
              outside: "opacity-20",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                ),
            }}
          />
          <div className="border-t border-white/8 px-3.5 py-2.5">
            <p className="text-[11px] leading-relaxed text-white/45">
              {pendingFrom && !isRangeSelection
                ? "Click a second date for multi-day, or click outside to keep one day."
                : "One date uses duration (hrs). Multiple dates switch to drop-off time."}
            </p>
            {pendingFrom && (
              <button
                type="button"
                onClick={() => {
                  finalizeSelection(pendingFrom, pendingFrom);
                  setPendingFrom(undefined);
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg bg-[#bca066] px-3 py-1.5 text-[12px] font-semibold text-[#1a1510] transition-opacity hover:opacity-90"
              >
                Use single day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BarRouteMiles({
  miles,
  distanceText,
  loading,
}: {
  miles: number | null;
  distanceText: string;
  loading: boolean;
}) {
  const display = loading
    ? "Calculating…"
    : miles != null
      ? distanceText || `${miles} mi`
      : "Enter destination";

  return (
    <div>
      <p className={LABEL}>Miles / Distance</p>
      <div className={cn(FIELD, "justify-center px-4")}>
        <span className={cn("text-[14px] font-semibold tabular-nums", FIELD_VALUE)}>
          {display}
        </span>
      </div>
    </div>
  );
}

function BarVenueMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <div className={cn(FIELD, "px-4")}>
        <span className={cn("truncate text-[13px] font-medium", FIELD_VALUE)}>{value}</span>
      </div>
    </div>
  );
}

function BarDuration({
  value,
  onChange,
  min,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
}) {
  return (
    <div>
      <p className={LABEL}>Duration (hrs)</p>
      <div className={cn(FIELD, "justify-between px-2")}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/8 hover:text-white"
        >
          −
        </button>
        <span className="text-[14px] font-semibold text-white tabular-nums">
          {value}h
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(24, value + 1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/8 hover:text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

function BarTimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <p className={LABEL}>Drop-off Time</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD, "cursor-pointer")}
      >
        <span className="shrink-0 text-[#bca066]/70">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span
          className={cn(
            "flex-1 text-left",
            value ? FIELD_VALUE : FIELD_PLACEHOLDER,
          )}
        >
          {value || "Select time"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-white/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#2a302e] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                onChange(slot);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-[13px] transition-colors",
                value === slot
                  ? "bg-white/8 font-medium text-[#bca066]"
                  : "text-white/85 hover:bg-white/6",
              )}
            >
              {slot}
              {value === slot && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#bca066]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BarSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: "car";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, []);

  const displayLabel = value ? value.split(" $")[0] : "";

  return (
    <div ref={containerRef} className="relative">
      <p className={LABEL}>{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD, "cursor-pointer")}
      >
        {icon === "car" && (
          <span className="shrink-0 text-[#c5a373]/70">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path d="M3 14h18" />
              <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
              <circle cx="7.5" cy="16.8" r="1.7" />
              <circle cx="16.5" cy="16.8" r="1.7" />
            </svg>
          </span>
        )}
        <span
          className={cn(
            "flex-1 truncate text-left",
            displayLabel ? FIELD_VALUE : FIELD_PLACEHOLDER,
          )}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-white/35 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#3d423f] bg-[#2a302e] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {options.map((opt) => {
            const display = opt.price ? `${opt.label} ${opt.price}` : opt.label;
            const selected = value === display;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onChange(display);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-[13px] transition-colors",
                  selected
                    ? "bg-white/8 text-[#bca066]"
                    : "text-white/85 hover:bg-white/6",
                )}
              >
                <span>{opt.label}</span>
                <span className="flex items-center gap-2">
                  {opt.price && (
                    <span
                      className={cn(
                        "text-[12px]",
                        selected ? "text-[#bca066]/70" : "text-white/40",
                      )}
                    >
                      {opt.price}
                    </span>
                  )}
                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#bca066]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { VehicleOption, RegionOption, BuyHoursPayload };
