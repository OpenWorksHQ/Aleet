"use client";

import { useEffect, useState, useTransition } from "react";
import { getCustomerSiteUrl } from "@/lib/site-url";
import {
  deletePartnerClient,
  fetchAdminPartnersClient,
  resendPartnerPortalInviteClient,
  updatePartnerClient,
  type AdminPartnersPage,
} from "@/lib/admin-api";
import type { AdminPartner } from "./partner-types";
import { EditPartnerModal } from "./edit-partner-modal";
import { cn } from "@/lib/utils";

type StatusTab = "active" | "rejected";

type Props = {
  initialData: AdminPartnersPage;
};

export function ActivePartnersList({ initialData }: Props) {
  const [statusTab, setStatusTab] = useState<StatusTab>("active");
  const [partners, setPartners] = useState(initialData.partners);
  const [editingPartner, setEditingPartner] = useState<AdminPartner | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const siteUrl = getCustomerSiteUrl();

  async function load(status: StatusTab) {
    setLoading(true);
    setInviteMessage(null);
    try {
      const res = await fetchAdminPartnersClient({
        status: status === "rejected" ? "inactive" : "active",
        limit: 100,
      });
      setPartners(res.partners);
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : "Failed to load partners");
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (statusTab === "active") {
      setPartners(initialData.partners);
      return;
    }
    void load("rejected");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab]);

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

  function handleDelete(partner: AdminPartner) {
    if (!window.confirm(`Pause partner "${partner.partnerName}"? They move to the Rejected tab.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deletePartnerClient(partner.partnerId);
        setPartners((prev) => prev.filter((p) => p.partnerId !== partner.partnerId));
        setInviteMessage(`${partner.partnerName} moved to Rejected (paused)`);
      } catch (err) {
        setInviteMessage(err instanceof Error ? err.message : "Failed to delete partner");
      }
    });
  }

  function handleRestore(partner: AdminPartner) {
    startTransition(async () => {
      try {
        await updatePartnerClient(partner.partnerId, { status: "active" });
        setPartners((prev) => prev.filter((p) => p.partnerId !== partner.partnerId));
        setInviteMessage(`${partner.partnerName} restored to Active`);
      } catch (err) {
        setInviteMessage(err instanceof Error ? err.message : "Failed to restore partner");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {([
          { id: "active", label: "Active" },
          { id: "rejected", label: "Rejected" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusTab(tab.id)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              statusTab === tab.id
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-border text-muted hover:text-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {inviteMessage ? (
        <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          {inviteMessage}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center text-sm text-muted">
          Loading…
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {statusTab === "rejected"
              ? "No rejected/paused partners."
              : "No active partners yet. Approve an application to create one."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
          <div className="hidden grid-cols-[minmax(0,1fr)_90px_100px_minmax(0,1fr)_70px_70px_minmax(220px,1fr)] gap-3 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted lg:grid">
            <span>Partner</span>
            <span>Code</span>
            <span>Type</span>
            <span>Links</span>
            <span>Discount</span>
            <span>Portal</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-border">
            {partners.map((partner) => (
              <PartnerRow
                key={partner.partnerId}
                partner={partner}
                siteUrl={siteUrl}
                disabled={isPending}
                mode={statusTab}
                onEdit={() => setEditingPartner(partner)}
                onResendInvite={() => handleResendInvite(partner.partnerId)}
                onDelete={() => handleDelete(partner)}
                onRestore={() => handleRestore(partner)}
              />
            ))}
          </div>
        </div>
      )}

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
  mode,
  onEdit,
  onResendInvite,
  onDelete,
  onRestore,
}: {
  partner: AdminPartner;
  siteUrl: string;
  disabled: boolean;
  mode: StatusTab;
  onEdit: () => void;
  onResendInvite: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const venueLink = partner.venueSlug ? `${siteUrl}/access/${partner.venueSlug}` : null;
  const trackingLink = partner.trackingSlug ? `${siteUrl}/${partner.trackingSlug}` : null;
  const portalStatus = partner.portalAccountStatus ?? "none";

  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_90px_100px_minmax(0,1fr)_70px_70px_minmax(220px,1fr)] lg:items-center lg:gap-3">
      <div>
        <p className="font-medium text-text">{partner.partnerName}</p>
        <p className="text-[12px] text-muted lg:hidden">{partner.partnerCode}</p>
      </div>
      <p className="hidden font-mono text-sm text-gold lg:block">{partner.partnerCode}</p>
      <p className="text-sm capitalize text-muted">
        {partner.partnerType === "venue"
          ? "Venue Access"
          : "Affiliate Marketer"}
      </p>
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
        {mode === "rejected"
          ? "Paused"
          : portalStatus === "active"
            ? "Active"
            : portalStatus === "pending"
              ? "Invite pending"
              : "—"}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        {mode === "rejected" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRestore}
            className="shrink-0 rounded-lg border border-gold/30 px-3 py-1.5 text-[12px] font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            Restore
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted hover:border-gold/30 hover:text-gold"
            >
              Edit
            </button>
            {portalStatus !== "active" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onResendInvite}
                className="shrink-0 rounded-lg border border-gold/30 px-3 py-1.5 text-[12px] font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
              >
                Resend invite
              </button>
            ) : (
              <span
                className="min-w-0 flex-1 truncate text-[12px] text-muted"
                title={partner.portalEmail ?? undefined}
              >
                {partner.portalEmail ?? ""}
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
