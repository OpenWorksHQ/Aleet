"use client";

import { Check, Clock, DollarSign, MapPin, Route } from "lucide-react";
import type { BookingData } from "@/app/components/booking/booking-types";
import type { BookingPriceResult } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";

type VenueAccessSummaryProps = {
  data: BookingData;
  serverPrice: BookingPriceResult | null;
  priceLoading?: boolean;
  className?: string;
};

function SummaryItem({
  label,
  value,
  done,
  icon,
}: {
  label: string;
  value: string;
  done: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        done ? "border-aleet-gold/25 bg-aleet-gold/8" : "border-aleet-border bg-aleet-cream",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          done ? "bg-aleet-gold/15 text-aleet-gold" : "bg-aleet-card text-aleet-text-subtle",
        )}
      >
        {done ? <Check className="h-4 w-4" /> : icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-aleet-text">{value}</p>
      </div>
    </div>
  );
}

export function VenueAccessSummary({
  data,
  serverPrice,
  priceLoading,
  className,
}: VenueAccessSummaryProps) {
  const hasPickup = !!data.pickupAddress.text;
  const hasDropoff = !!data.dropoffAddress.text;
  const hasDuration = !!data.estimatedDurationHours || !!data.routeDurationText;
  const hasMiles = data.routeDistanceMiles != null && data.routeDistanceMiles > 0;
  const hasPrice = !!serverPrice?.total;

  const durationLabel =
    data.routeDurationText ??
    (data.estimatedDurationHours ? `${data.estimatedDurationHours}h estimated` : "Calculating…");

  const milesLabel = hasMiles
    ? `${data.routeDistanceMiles} mi`
    : "Enter drop-off to calculate";

  const priceLabel = priceLoading
    ? "Calculating…"
    : hasPrice
      ? `$${serverPrice!.total.toFixed(0)}`
      : "Enter drop-off to see price";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-5", className)}>
      <SummaryItem
        label="Pickup"
        value={data.pickupAddress.text || "Partner venue"}
        done={hasPickup}
        icon={<MapPin className="h-4 w-4" />}
      />
      <SummaryItem
        label="Drop-off"
        value={data.dropoffAddress.text || "Enter destination"}
        done={hasDropoff}
        icon={<Route className="h-4 w-4" />}
      />
      <SummaryItem
        label="Distance"
        value={milesLabel}
        done={hasMiles}
        icon={<Route className="h-4 w-4" />}
      />
      <SummaryItem
        label="Est. Duration"
        value={durationLabel}
        done={hasDuration}
        icon={<Clock className="h-4 w-4" />}
      />
      <SummaryItem
        label="Price"
        value={priceLabel}
        done={hasPrice && !priceLoading}
        icon={<DollarSign className="h-4 w-4" />}
      />
    </div>
  );
}
