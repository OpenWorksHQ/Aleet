"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildGoogleMapsSearchUrl,
  copyAddressToClipboard,
} from "@/lib/google-maps";

type TripAddressLinkProps = {
  label: string;
  address: string;
  className?: string;
  onActivate?: () => void;
};

export function TripAddressLink({
  label,
  address,
  className,
  onActivate,
}: TripAddressLinkProps) {
  const trimmed = address.trim();
  const mapsUrl = buildGoogleMapsSearchUrl(trimmed);

  if (!trimmed) {
    return (
      <div className={className}>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-text">—</p>
      </div>
    );
  }

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    onActivate?.();
    const ok = await copyAddressToClipboard(trimmed);
    if (ok) {
      toast.success("Address copied");
    } else {
      toast.error("Could not copy address");
    }
  }

  function handleOpenMaps(e: React.MouseEvent) {
    e.stopPropagation();
    onActivate?.();
    if (!mapsUrl) return;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("min-w-0", className)} onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        {mapsUrl ? (
          <button
            type="button"
            onClick={handleOpenMaps}
            className="group min-w-0 flex-1 rounded-lg border border-border bg-white/2 px-3 py-2 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
          >
            <span className="flex items-start gap-2">
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="text-sm text-text group-hover:text-gold">{trimmed}</span>
            </span>
            <span className="mt-1 block text-[11px] text-muted group-hover:text-gold/80">
              Tap to open in Google Maps
            </span>
          </button>
        ) : (
          <p className="flex-1 text-sm text-text">{trimmed}</p>
        )}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy address"
          aria-label={`Copy ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-gold/40 hover:text-gold"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
