"use client";

import { useState, useTransition } from "react";
import { getCustomerSiteUrl } from "@/lib/site-url";
import { resendPartnerPortalInviteClient, type AdminPartnersPage } from "@/lib/admin-api";
import type { AdminPartner } from "./partner-types";
import { EditPartnerModal } from "./edit-partner-modal";

type Props = {
  initialData: AdminPartnersPage;
};

export function ActivePartnersList({ initialData }: Props) {
  const [partners, setPartners] = useState(initialData.partners);
  const [editingPartner, setEditingPartner] = useState<AdminPartner | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const siteUrl = getCustomerSiteUrl();

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center">
        <p className="text-sm text-muted">No active partners yet. Approve an application to create one.</p>
      </div>
    );
  }

  function handleResendInvite(partnerId: string) {
    startTransition(async () => {
      try {
        const result = await resendPartnerPortalInviteClient(partnerId);
        setInviteMessage(result.message ?? `Invite sent to ${result.email}`);
        if (!result.alreadyActive) {
          setPartners((prev) =>
            prev.map((p) =>
              p.partnerId === partnerId
                ? { ...p, portalAccountStatus: "pending", portalEmail: result.email }
                : p,
            ),
          );
        }
      } catch (err) {
        setInviteMessage(err instanceof Error ? err.message : "Failed to resend invite");
      }
    });
  }

  return (
    <>
      {inviteMessage ? (
        <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          {inviteMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
        <div className="hidden grid-cols-[minmax(0,1fr)_90px_100px_minmax(0,1fr)_70px_70px_100px_120px] gap-3 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted lg:grid">
          <span>Partner</span>
          <span>Code</span>
          <span>Type</span>
          <span>Links</span>
          <span>Discount</span>
          <span>Portal</span>
          <span />
          <span />
        </div>
        <div className="divide-y divide-border">
          {partners.map((partner) => (
            <PartnerRow
              key={partner.partnerId}
              partner={partner}
              siteUrl={siteUrl}
              disabled={isPending}
              onEdit={() => setEditingPartner(partner)}
              onResendInvite={() => handleResendInvite(partner.partnerId)}
            />
          ))}
        </div>
      </div>

      {editingPartner ? (
        <EditPartnerModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onUpdated={(updated) => {
            setPartners((prev) =>
              prev.map((p) => (p.partnerId === updated.partnerId ? updated : p)),
            );
          }}
        />
      ) : null}
    </>
  );
}

function PartnerRow({
  partner,
  siteUrl,
  disabled,
  onEdit,
  onResendInvite,
}: {
  partner: AdminPartner;
  siteUrl: string;
  disabled: boolean;
  onEdit: () => void;
  onResendInvite: () => void;
}) {
  const venueLink = partner.venueSlug ? `${siteUrl}/access/${partner.venueSlug}` : null;
  const trackingLink = partner.trackingSlug ? `${siteUrl}/${partner.trackingSlug}` : null;
  const portalStatus = partner.portalAccountStatus ?? "none";

  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_90px_100px_minmax(0,1fr)_70px_70px_100px_120px] lg:items-center lg:gap-3">
      <div>
        <p className="font-medium text-text">{partner.partnerName}</p>
        <p className="text-[12px] text-muted lg:hidden">{partner.partnerCode}</p>
      </div>
      <p className="hidden font-mono text-sm text-gold lg:block">{partner.partnerCode}</p>
      <p className="text-sm capitalize text-muted">{partner.partnerType.replace("_", " ")}</p>
      <div className="space-y-1 text-[12px]">
        {venueLink ? (
          <a href={venueLink} target="_blank" rel="noopener noreferrer" className="block truncate text-gold hover:underline">
            {venueLink}
          </a>
        ) : null}
        {trackingLink ? (
          <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="block truncate text-gold hover:underline">
            {trackingLink}
          </a>
        ) : null}
        {!venueLink && !trackingLink ? <span className="text-muted">—</span> : null}
      </div>
      <p className="text-sm text-text">{partner.discountPct ?? 0}%</p>
      <p className="text-[12px] capitalize text-muted">
        {portalStatus === "active" ? "Active" : portalStatus === "pending" ? "Invite pending" : "—"}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted hover:border-gold/30 hover:text-gold"
        >
          Edit
        </button>
      </div>
      <div className="flex justify-end">
        {portalStatus !== "active" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onResendInvite}
            className="rounded-lg border border-gold/30 px-3 py-1.5 text-[12px] font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            Resend invite
          </button>
        ) : (
          <span className="text-[12px] text-muted">{partner.portalEmail ?? ""}</span>
        )}
      </div>
    </div>
  );
}
