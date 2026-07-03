"use client";

import { useState } from "react";
import { getCustomerSiteUrl } from "@/lib/site-url";
import type { AdminPartnersPage } from "@/lib/admin-api";
import type { AdminPartner } from "./partner-types";

type Props = {
  initialData: AdminPartnersPage;
};

export function ActivePartnersList({ initialData }: Props) {
  const [partners] = useState(initialData.partners);
  const siteUrl = getCustomerSiteUrl();

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center">
        <p className="text-sm text-muted">No active partners yet. Approve an application to create one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
      <div className="hidden grid-cols-[minmax(0,1.2fr)_100px_120px_minmax(0,1fr)_100px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted lg:grid">
        <span>Partner</span>
        <span>Code</span>
        <span>Type</span>
        <span>Links</span>
        <span>Discount</span>
      </div>
      <div className="divide-y divide-border">
        {partners.map((partner) => (
          <PartnerRow key={partner.partnerId} partner={partner} siteUrl={siteUrl} />
        ))}
      </div>
    </div>
  );
}

function PartnerRow({ partner, siteUrl }: { partner: AdminPartner; siteUrl: string }) {
  const venueLink = partner.venueSlug ? `${siteUrl}/access/${partner.venueSlug}` : null;
  const trackingLink = partner.trackingSlug ? `${siteUrl}/${partner.trackingSlug}` : null;

  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_100px_120px_minmax(0,1fr)_100px] lg:items-center lg:gap-4">
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
    </div>
  );
}
