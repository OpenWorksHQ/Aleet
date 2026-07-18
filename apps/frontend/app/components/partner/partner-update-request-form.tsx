"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeWebsiteUrl } from "@/lib/normalize-website";
import { checkPartnerContactEmailForUpdate, submitPartnerUpdateRequestMe } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { toast, AddressAutocomplete } from "@/app/components/ui";
import type { PartnerProfile, PartnerUpdateRequestPayload } from "@/lib/partner/types";
import { partnerAuthInputClass } from "@/app/components/partner/partner-auth-card";
import {
  getPartnerFieldError,
  PartnerContactEmailError,
} from "@/app/components/partner/partner-contact-email-error";

type Props = {
  profile: PartnerProfile;
  hasPendingRequest: boolean;
  onSubmitted: () => void;
};

export function PartnerUpdateRequestForm({ profile, hasPendingRequest, onSubmitted }: Props) {
  const [pickupText, setPickupText] = useState(profile.pickupLocation?.text ?? "");
  const [pickupPlaceId, setPickupPlaceId] = useState(profile.pickupLocation?.placeId ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [businessPlaceId, setBusinessPlaceId] = useState(profile.businessLocation?.placeId ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [contactName, setContactName] = useState(profile.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "");
  const [businessName, setBusinessName] = useState(profile.businessName ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [notes, setNotes] = useState(profile.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [contactEmailDetail, setContactEmailDetail] = useState<
    ReturnType<typeof getPartnerFieldError>
  >(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyContactEmailError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const detail = getPartnerFieldError(err.errors, "contactEmail");
      if (detail || err.message.toLowerCase().includes("email")) {
        setContactEmailError(err.message);
        setContactEmailDetail(detail);
        return true;
      }
    }
    return false;
  }, []);

  const validateContactEmail = useCallback(
    async (email: string, originalEmail: string) => {
      const trimmed = email.trim();
      if (!trimmed || trimmed.toLowerCase() === originalEmail.trim().toLowerCase()) {
        setContactEmailError(null);
        setContactEmailDetail(null);
        return true;
      }

      setCheckingEmail(true);
      try {
        await checkPartnerContactEmailForUpdate(trimmed);
        setContactEmailError(null);
        setContactEmailDetail(null);
        return true;
      } catch (err) {
        applyContactEmailError(err);
        return false;
      } finally {
        setCheckingEmail(false);
      }
    },
    [applyContactEmailError],
  );

  useEffect(() => {
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, []);

  function handleContactEmailChange(value: string) {
    setContactEmail(value);
    setError(null);
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    setContactEmailError(null);
    setContactEmailDetail(null);

    const trimmed = value.trim();
    if (!trimmed || !trimmed.includes("@") || trimmed.toLowerCase() === (profile.contactEmail ?? "").trim().toLowerCase()) {
      return;
    }

    emailCheckTimer.current = setTimeout(() => {
      void validateContactEmail(trimmed, profile.contactEmail ?? "");
    }, 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasPendingRequest) {
      toast.error("You already have a pending update request.");
      return;
    }

    setLoading(true);
    setError(null);

    let normalizedWebsite: string | undefined;
    if (website.trim()) {
      try {
        normalizedWebsite = normalizeWebsiteUrl(website.trim()) ?? undefined;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Enter a valid website.";
        setError(message);
        setLoading(false);
        return;
      }
    }

    if (contactEmail.trim() !== (profile.contactEmail ?? "")) {
      const emailOk = await validateContactEmail(contactEmail, profile.contactEmail ?? "");
      if (!emailOk) {
        setLoading(false);
        return;
      }
    }

    const payload: PartnerUpdateRequestPayload = {};
    const currentPickup = profile.pickupLocation?.text ?? "";
    if (
      pickupText.trim() !== currentPickup ||
      pickupPlaceId.trim() !== (profile.pickupLocation?.placeId ?? "")
    ) {
      if (pickupText.trim() && !pickupPlaceId.trim()) {
        setError("Select a verified Google address for the pickup location.");
        setLoading(false);
        return;
      }
      payload.pickupLocation = { text: pickupText.trim(), placeId: pickupPlaceId.trim() };
    }
    if (
      address.trim() !== (profile.address ?? "") ||
      businessPlaceId.trim() !== (profile.businessLocation?.placeId ?? "")
    ) {
      if (address.trim() && !businessPlaceId.trim()) {
        setError("Select a verified Google address for the business location.");
        setLoading(false);
        return;
      }
      payload.address = address.trim();
      payload.businessLocation = { text: address.trim(), placeId: businessPlaceId.trim() };
    }
    if (city.trim() !== (profile.city ?? "")) payload.city = city.trim();
    if (state.trim() !== (profile.state ?? "")) payload.state = state.trim();
    if (contactName.trim() !== (profile.contactName ?? "")) payload.contactName = contactName.trim();
    if (contactEmail.trim() !== (profile.contactEmail ?? "")) payload.contactEmail = contactEmail.trim();
    if (contactPhone.trim() !== (profile.contactPhone ?? "")) payload.contactPhone = contactPhone.trim();
    if (businessName.trim() !== (profile.businessName ?? "")) payload.businessName = businessName.trim();
    if ((normalizedWebsite ?? "") !== (profile.website ?? "")) payload.website = normalizedWebsite;
    if (notes.trim() !== (profile.notes ?? "")) payload.notes = notes.trim();

    if (!Object.keys(payload).length) {
      setError("No changes to submit.");
      setLoading(false);
      return;
    }

    try {
      await submitPartnerUpdateRequestMe(payload);
      toast.success("Update request submitted for admin review.");
      onSubmitted();
    } catch (err) {
      if (applyContactEmailError(err)) {
        toast.error(err instanceof ApiError ? err.message : "Invalid email.");
        return;
      }
      const message = err instanceof ApiError ? err.message : "Could not submit request.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-aleet-border bg-aleet-card p-6 shadow-sm">
      <h2 className="font-serif text-xl text-aleet-text">Request profile update</h2>
      <p className="mt-2 text-[13px] text-aleet-text-muted">
        Changes are reviewed by our team before going live on your partner page and booking flow.
      </p>
      {hasPendingRequest ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          You have a pending update request. Wait for admin review before submitting another.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AddressAutocomplete
            label="Venue / pickup location"
            value={pickupText}
            onChange={(value) => {
              setPickupText(value);
              setPickupPlaceId("");
            }}
            onPlaceChange={(place) => {
              setPickupText(place.text);
              setPickupPlaceId(place.placeId);
            }}
            placeholder="Search Google address…"
          />
        </div>
        <div className="sm:col-span-2">
          <AddressAutocomplete
            label="Business street address"
            value={address}
            onChange={(value) => {
              setAddress(value);
              setBusinessPlaceId("");
            }}
            onPlaceChange={(place) => {
              setAddress(place.text);
              setBusinessPlaceId(place.placeId);
            }}
            placeholder="Search Google address…"
          />
        </div>
        <Field label="City">
          <input value={city} onChange={(e) => setCity(e.target.value)} className={partnerAuthInputClass} />
        </Field>
        <Field label="State">
          <input value={state} onChange={(e) => setState(e.target.value)} className={partnerAuthInputClass} />
        </Field>
        <Field label="Contact name">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={partnerAuthInputClass} />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => handleContactEmailChange(e.target.value)}
            onBlur={() => void validateContactEmail(contactEmail, profile.contactEmail ?? "")}
            className={partnerAuthInputClass}
            aria-invalid={Boolean(contactEmailError)}
          />
          {checkingEmail ? (
            <p className="mt-1.5 text-[12px] text-aleet-text-subtle">Checking email…</p>
          ) : null}
          {contactEmailError ? (
            <PartnerContactEmailError
              message={contactEmailError}
              detail={contactEmailDetail}
            />
          ) : null}
        </Field>
        <Field label="Contact phone">
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={partnerAuthInputClass} />
        </Field>
        <Field label="Business name">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={partnerAuthInputClass} />
        </Field>
        <Field label="Website">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="mango.com" className={partnerAuthInputClass} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={partnerAuthInputClass} />
        </Field>
        {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading || hasPendingRequest || Boolean(contactEmailError) || checkingEmail}
            className="rounded-xl bg-aleet-gold px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-aleet-text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}
