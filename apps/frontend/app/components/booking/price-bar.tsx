"use client";

import { Loader2 } from "lucide-react";
import type { BookingPriceResult } from "@/lib/api/bookings";

type Props = {
    serverPrice: BookingPriceResult | null;
    priceLoading: boolean;
    clientEstimate: number | null;
};

export function PriceBar({ serverPrice, priceLoading, clientEstimate }: Props) {
    const hasAnything = priceLoading || serverPrice !== null || (clientEstimate !== null && clientEstimate > 0);
    if (!hasAnything) return null;

    return (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[#bca066]/20 bg-[#bca066]/5 px-4 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-[#5a7080]">
                Estimated Total
            </span>

            {priceLoading ? (
                <span className="flex items-center gap-1.5 text-[13px] text-[#5a7080]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Calculating…
                </span>
            ) : serverPrice ? (
                <span className="text-[18px] font-bold text-[#bca066]">
                    ${serverPrice.total.toFixed(0)}
                </span>
            ) : clientEstimate !== null && clientEstimate > 0 ? (
                <span className="text-[18px] font-bold text-[#bca066]/60">
                    ~${clientEstimate.toFixed(0)}
                </span>
            ) : null}
        </div>
    );
}
