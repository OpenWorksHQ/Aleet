"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { updatePartnerClient } from "@/lib/admin-api";
import type { AdminPartner, UpdatePartnerBody } from "./partner-types";

type Props = {
  partner: AdminPartner;
  onClose: () => void;
  onUpdated: (partner: AdminPartner) => void;
};

export function EditPartnerModal({ partner, onClose, onUpdated }: Props) {
  const [partnerType, setPartnerType] = useState<AdminPartner["partnerType"]>(
    partner.partnerType === "venue" ? "venue" : "affiliate_marketer",
  );
  const [discountPct, setDiscountPct] = useState(String(partner.discountPct ?? 0));
  const [commissionPct, setCommissionPct] = useState(
    partner.commissionPct != null ? String(partner.commissionPct) : "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setIsLoading(true);

    const body: UpdatePartnerBody = {
      partnerType,
      bookingMode: partnerType === "venue" ? "venue_access" : "standard",
      discountPct: Number(discountPct) || 0,
      commissionPct: commissionPct.trim() ? Number(commissionPct) : null,
    };

    try {
      const updated = await updatePartnerClient(partner.partnerId, body);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to update partner");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-text">Edit partner</h2>
            <p className="mt-1 text-sm text-muted">
              {partner.partnerName} · <span className="font-mono text-gold">{partner.partnerCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {apiError ? (
            <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
              {apiError}
            </p>
          ) : null}

          <Field label="Partner type">
            <select
              value={partnerType}
              onChange={(e) =>
                setPartnerType(e.target.value as "venue" | "affiliate_marketer")
              }
              className={inputClass}
            >
              <option value="venue">Venue Access</option>
              <option value="affiliate_marketer">Affiliate Marketer</option>
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount %">
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Commission % (optional)">
              <input
                type="number"
                min={0}
                max={100}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="Platform default"
                className={inputClass}
              />
            </Field>
          </div>

          <p className="text-[12px] text-muted">
            Changes apply immediately to new bookings using this partner&apos;s code or links.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex-1 rounded-xl border border-gold/30 bg-gold/15 py-2.5 text-sm font-medium text-gold hover:bg-gold/25 disabled:opacity-50",
              )}
            >
              {isLoading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-gold/40";
