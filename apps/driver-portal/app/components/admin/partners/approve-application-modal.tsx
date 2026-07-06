"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { approvePartnerApplicationClient } from "@/lib/admin-api";
import { getCustomerSiteUrl } from "@/lib/site-url";
import type {
  AdminPartner,
  ApprovePartnerApplicationBody,
  PartnerApplication,
} from "./partner-types";
import { inferVenueApplication } from "./partner-types";

type Props = {
  application: PartnerApplication;
  onClose: () => void;
  onApproved: (result: { partner: AdminPartner; application: PartnerApplication }) => void;
};

export function ApproveApplicationModal({ application, onClose, onApproved }: Props) {
  const isVenue = useMemo(
    () => inferVenueApplication(application.businessType),
    [application.businessType],
  );

  const defaultPickup = `${application.address}, ${application.city}, ${application.state}`;

  const [partnerCode, setPartnerCode] = useState("");
  const [partnerType, setPartnerType] = useState<"venue" | "affiliate" | "marketer">(
    isVenue ? "venue" : "affiliate",
  );
  const [venueSlug, setVenueSlug] = useState("");
  const [trackingSlug, setTrackingSlug] = useState("");
  const [pickupText, setPickupText] = useState(defaultPickup);
  const [pickupLocked, setPickupLocked] = useState(isVenue);
  const [dropoffLocked, setDropoffLocked] = useState(false);
  const [discountPct, setDiscountPct] = useState("5");
  const [commissionPct, setCommissionPct] = useState("");
  const [pricingNote, setPricingNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ partner: AdminPartner } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setIsLoading(true);

    const body: ApprovePartnerApplicationBody = {
      partnerType,
      discountPct: Number(discountPct) || 0,
    };

    if (partnerCode.trim()) body.partnerCode = partnerCode.trim().toUpperCase();
    if (venueSlug.trim()) body.venueSlug = venueSlug.trim();
    if (trackingSlug.trim()) body.trackingSlug = trackingSlug.trim();
    if (commissionPct.trim()) body.commissionPct = Number(commissionPct);
    if (pricingNote.trim()) body.pricingNote = pricingNote.trim();
    if (pickupText.trim()) {
      body.pickupLocation = { text: pickupText.trim(), placeId: "" };
    }
    body.pickupLocked = pickupLocked;
    body.dropoffLocked = dropoffLocked;

    try {
      const result = await approvePartnerApplicationClient(application.id, body);
      setSuccess({ partner: result.partner });
      onApproved(result);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setIsLoading(false);
    }
  }

  const siteUrl = getCustomerSiteUrl();
  const bookingLink = success?.partner?.venueSlug
    ? `${siteUrl}/access/${success.partner.venueSlug}`
    : success?.partner?.trackingSlug
      ? `${siteUrl}/${success.partner.trackingSlug}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-text">Approve application</h2>
            <p className="mt-1 text-sm text-muted">{application.businessName}</p>
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

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-medium text-emerald-400">Partner created successfully</p>
              <p className="mt-1 text-sm text-muted">
                Code: <span className="font-mono text-text">{success.partner.partnerCode}</span>
              </p>
            </div>
            {bookingLink ? (
              <div className="rounded-xl border border-border bg-page-bg px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Booking link</p>
                <p className="mt-1 break-all text-sm text-gold">{bookingLink}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-gold/30 bg-gold/15 py-2.5 text-sm font-medium text-gold hover:bg-gold/25"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-page-bg px-4 py-3 text-sm text-muted">
              <p>
                <span className="text-text">{application.contactName}</span> · {application.contactEmail}
              </p>
              <p className="mt-1">
                {application.businessType} · {application.city}, {application.state}
              </p>
              {application.notes ? (
                <p className="mt-2 text-[13px] italic">&ldquo;{application.notes}&rdquo;</p>
              ) : null}
            </div>

            {apiError ? (
              <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                {apiError}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Partner type">
                <select
                  value={partnerType}
                  onChange={(e) =>
                    setPartnerType(e.target.value as "venue" | "affiliate" | "marketer")
                  }
                  className={inputClass}
                >
                  <option value="venue">Venue</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="marketer">Marketer</option>
                </select>
              </Field>
              <Field label="Partner code (optional)">
                <input
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className={inputClass}
                />
              </Field>
            </div>

            {partnerType === "venue" ? (
              <>
                <Field label="Venue slug (optional)">
                  <input
                    value={venueSlug}
                    onChange={(e) => setVenueSlug(e.target.value)}
                    placeholder="e.g. mgm-grand"
                    className={inputClass}
                  />
                </Field>
                <Field label="Pickup location">
                  <input
                    value={pickupText}
                    onChange={(e) => setPickupText(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </>
            ) : (
              <Field label="Tracking slug (optional)">
                <input
                  value={trackingSlug}
                  onChange={(e) => setTrackingSlug(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className={inputClass}
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={pickupLocked}
                  onChange={(e) => setPickupLocked(e.target.checked)}
                />
                Lock pickup location
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={dropoffLocked}
                  onChange={(e) => setDropoffLocked(e.target.checked)}
                />
                Lock drop-off at partner venue
              </label>
            </div>

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

            <Field label="Pricing note (optional)">
              <input
                value={pricingNote}
                onChange={(e) => setPricingNote(e.target.value)}
                placeholder="Shown to guests during booking"
                className={inputClass}
              />
            </Field>

            <p className="text-[12px] text-muted">
              {isVenue
                ? "Detected as a venue application based on business type."
                : "Detected as a standard affiliate/marketer application."}
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
                className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {isLoading ? "Approving…" : "Approve & create partner"}
              </button>
            </div>
          </form>
        )}
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
