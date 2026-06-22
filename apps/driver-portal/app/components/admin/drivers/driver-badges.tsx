import { cn } from "@/lib/utils";
import type { DriverStatus } from "./driver-types";

const statusMap: Record<DriverStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-border/60 text-muted" },
    submitted: { label: "Submitted", cls: "bg-blue-500/15 text-blue-400" },
    background_pending: { label: "BG Pending", cls: "bg-gold/15 text-gold" },
    background_in_review: { label: "BG In Review", cls: "bg-amber-500/15 text-amber-400" },
    background_completed: { label: "BG Completed", cls: "bg-cyan-500/15 text-cyan-400" },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400" },
    rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400" },
    needs_revision: { label: "Needs Revision", cls: "bg-orange-500/15 text-orange-400" },
    revision_complete: { label: "Revision Complete", cls: "bg-purple-500/15 text-purple-400" },
};

const knownTiers: Record<string, { label: string; cls: string }> = {
    "s-level": { label: "S-Level", cls: "bg-blue-500/15 text-blue-400" },
    pro: { label: "Pro", cls: "bg-emerald-500/15 text-emerald-400" },
    diamond: { label: "Diamond", cls: "bg-purple-500/15 text-purple-400" },
    standard: { label: "Standard", cls: "bg-border/60 text-muted" },
    elite: { label: "Elite", cls: "bg-gold/15 text-gold" },
    premium: { label: "Premium", cls: "bg-purple-500/15 text-purple-400" },
};

export function StatusBadge({ status }: { status: DriverStatus }) {
    const { label, cls } = statusMap[status] ?? { label: status, cls: "bg-border/60 text-muted" };
    return (
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", cls)}>
            {label}
        </span>
    );
}

export function TierBadge({ tier }: { tier: string }) {
    const key = tier?.toLowerCase();
    const { label, cls } = knownTiers[key] ?? { label: tier ?? "—", cls: "bg-border/60 text-muted" };
    return (
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", cls)}>
            {label}
        </span>
    );
}

function formatRelative(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    const m = Math.floor(ms / 60_000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

/** Whether the driver counts toward same-day coverage (AQD). */
export function OnlineBadge({ isOnline, lastSeenAt }: { isOnline: boolean; lastSeenAt: string | null }) {
    if (isOnline) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available · AQD
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-2 py-0.5 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
            {lastSeenAt ? `Unavailable · ${formatRelative(lastSeenAt)}` : "Unavailable"}
        </span>
    );
}

export function AvailabilityBadge({ status }: { status: string }) {
    const on = status === "available" || status === "on_call";
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                on ? "bg-emerald-500/10 text-emerald-400" : "bg-border/40 text-muted",
            )}
        >
            {on ? "Available" : "Unavailable"}
        </span>
    );
}
