"use client";

import type { PartnerUpdateRequest } from "@/lib/partner/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
  rejected: "border-red-500/30 bg-red-500/10 text-red-700",
};

export function PartnerUpdateRequestsList({ requests }: { requests: PartnerUpdateRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="text-[13px] text-aleet-text-muted">No update requests yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request._id} className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-aleet-text">
              Submitted {formatDate(request.createdAt)}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase",
                STATUS_STYLES[request.status],
              )}
            >
              {request.status}
            </span>
          </div>
          {request.rejectionReason ? (
            <p className="mt-2 text-[12px] text-red-700">Reason: {request.rejectionReason}</p>
          ) : null}
          <ul className="mt-2 space-y-1 text-[12px] text-aleet-text-muted">
            {Object.entries(request.proposedChanges || {}).map(([field, value]) => (
              <li key={field}>
                <span className="font-medium text-aleet-text">{field}</span>:{" "}
                {formatValue(value)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text?: string }).text ?? "");
  }
  return String(value ?? "");
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
