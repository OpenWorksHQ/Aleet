"use client";

import { useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  fetchPartnerApplicationsClient,
  rejectPartnerApplicationClient,
  type PartnerApplicationsPage,
} from "@/lib/admin-api";
import type { AdminPartner, PartnerApplication, PartnerApplicationStatus } from "./partner-types";
import { ApproveApplicationModal } from "./approve-application-modal";

const STATUS_FILTERS: Array<{ label: string; value: PartnerApplicationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

type Props = {
  initialData: PartnerApplicationsPage;
};

export function PartnerApplicationsList({ initialData }: Props) {
  const [applications, setApplications] = useState(initialData.applications);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [statusFilter, setStatusFilter] = useState<PartnerApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] = useState<PartnerApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PartnerApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(
    (status: PartnerApplicationStatus | "all" = statusFilter) => {
      startTransition(async () => {
        try {
          const res = await fetchPartnerApplicationsClient({
            status: status === "all" ? undefined : status,
            limit: 50,
          });
          setApplications(res.applications);
          setPagination(res.pagination);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load applications");
        }
      });
    },
    [statusFilter],
  );

  const filtered = applications.filter((app) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      app.businessName.toLowerCase().includes(q) ||
      app.contactEmail.toLowerCase().includes(q) ||
      app.contactName.toLowerCase().includes(q) ||
      app.city.toLowerCase().includes(q)
    );
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  function handleApproved(result: {
    partner: AdminPartner;
    application: PartnerApplication;
  }) {
    setApplications((prev) =>
      prev.map((a) => (a.id === result.application.id ? result.application : a)),
    );
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    startTransition(async () => {
      try {
        const updated = await rejectPartnerApplicationClient(id, rejectReason.trim() || undefined);
        setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
        setRejectTarget(null);
        setRejectReason("");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject application");
      }
    });
  }

  return (
    <>
      <div className={cn("flex flex-col gap-4", isPending && "pointer-events-none opacity-60")}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, contact, city…"
            className="min-w-[220px] flex-1 rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text outline-none focus:border-gold/40"
          />
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
        </div>

        {error ? (
          <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Showing" value={String(filtered.length)} />
          <Stat label="Pending in view" value={String(pendingCount)} />
          <Stat label="Total" value={String(pagination.total)} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card-bg px-6 py-12 text-center">
            <p className="text-sm text-muted">No applications match this filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onApprove={() => setApproveTarget(app)}
                onReject={() => {
                  setRejectTarget(app);
                  setRejectReason("");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {approveTarget ? (
        <ApproveApplicationModal
          application={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={handleApproved}
        />
      ) : null}

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setRejectTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-text">Reject application</h3>
            <p className="mt-1 text-sm text-muted">{rejectTarget.businessName}</p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                Reason (optional)
              </span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none focus:border-gold/40"
                placeholder="Internal note or reason sent to applicant"
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
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
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

function ApplicationCard({
  application,
  onApprove,
  onReject,
}: {
  application: PartnerApplication;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card-bg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-text">{application.businessName}</h3>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {application.businessType} · {application.city}, {application.state}
          </p>
          <p className="mt-2 text-sm text-text">
            {application.contactName} ·{" "}
            <a href={`mailto:${application.contactEmail}`} className="text-gold hover:underline">
              {application.contactEmail}
            </a>{" "}
            · {application.contactPhone}
          </p>
          <p className="mt-1 text-[13px] text-muted">{application.address}</p>
          {application.website ? (
            <a
              href={application.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[13px] text-gold hover:underline"
            >
              {application.website}
            </a>
          ) : null}
          {application.notes ? (
            <p className="mt-2 rounded-lg bg-page-bg px-3 py-2 text-[13px] text-muted">
              {application.notes}
            </p>
          ) : null}
          {application.rejectionReason ? (
            <p className="mt-2 text-[13px] text-red-400">
              Rejection reason: {application.rejectionReason}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted/70">
            Submitted {formatDate(application.createdAt)}
          </p>
        </div>

        {application.status === "pending" ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PartnerApplicationStatus }) {
  const styles: Record<PartnerApplicationStatus, string> = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gold">{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
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
