"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  approvePartnerUpdateRequestClient,
  fetchPartnerUpdateRequestsClient,
  rejectPartnerUpdateRequestClient,
  type PartnerUpdateRequestsPage,
} from "@/lib/admin-api";
import type { PartnerUpdateRequestRecord } from "./partner-types";

const STATUS_FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "All", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

type Props = {
  initialData?: PartnerUpdateRequestsPage;
};

export function PartnerUpdateRequestsList({ initialData }: Props) {
  const [requests, setRequests] = useState(initialData?.requests ?? []);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PartnerUpdateRequestRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((status: string = statusFilter) => {
    startTransition(async () => {
      try {
        const res = await fetchPartnerUpdateRequestsClient({
          status: status === "all" ? undefined : status,
          limit: 50,
        });
        setRequests(res.requests);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load update requests");
      }
    });
  }, [statusFilter]);

  useEffect(() => {
    refresh("pending");
  }, [refresh]);

  function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approvePartnerUpdateRequestClient(id);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve request");
      }
    });
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const id = rejectTarget._id;
    startTransition(async () => {
      try {
        await rejectPartnerUpdateRequestClient(id, rejectReason.trim() || undefined);
        setRejectTarget(null);
        setRejectReason("");
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject request");
      }
    });
  }

  return (
    <>
      <div className={cn("flex flex-col gap-4", isPending && "pointer-events-none opacity-60")}>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setStatusFilter(filter.value);
                refresh(filter.value);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === filter.value
                  ? "border-gold/40 bg-gold/15 text-gold"
                  : "border-border text-muted hover:text-text",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center">
            <p className="text-sm text-muted">No update requests match this filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((request) => (
              <RequestCard
                key={request._id}
                request={request}
                onApprove={() => handleApprove(request._id)}
                onReject={() => {
                  setRejectTarget(request);
                  setRejectReason("");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-text">Reject update request</h3>
            <p className="mt-1 text-sm text-muted">
              {rejectTarget.partner?.partnerName ?? "Partner update"}
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                Reason (optional)
              </span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none focus:border-gold/40"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={isPending}
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 py-2.5 text-sm font-medium text-red-400"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: PartnerUpdateRequestRecord;
  onApprove: () => void;
  onReject: () => void;
}) {
  const partnerLabel = request.partner?.partnerName ?? "Partner";
  const partnerCode = request.partner?.partnerCode;

  return (
    <div className="rounded-2xl border border-border bg-card-bg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-text">{partnerLabel}</h3>
            {partnerCode ? (
              <span className="font-mono text-[12px] text-gold">{partnerCode}</span>
            ) : null}
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Requested {formatDate(request.createdAt)}
            {request.requestedBy?.email ? ` · ${request.requestedBy.email}` : ""}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DiffBlock title="Current" data={request.currentSnapshot} />
            <DiffBlock title="Requested" data={request.proposedChanges} highlight />
          </div>
        </div>
        {request.status === "pending" ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-400"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400"
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DiffBlock({
  title,
  data,
  highlight,
}: {
  title: string;
  data: Record<string, unknown>;
  highlight?: boolean;
}) {
  const entries = Object.entries(data || {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        highlight ? "border-gold/30 bg-gold/5" : "border-border bg-page-bg",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted">—</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[12px] text-text">
          {entries.map(([key, value]) => (
            <li key={key}>
              <span className="font-medium capitalize text-muted">{key}:</span> {formatValue(value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PartnerUpdateRequestRecord["status"] }) {
  const styles = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase", styles[status])}>
      {status}
    </span>
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
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
