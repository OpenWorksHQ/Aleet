"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchMembershipsClient,
  inviteFounder30Client,
  chargeMemberOverageClient,
  updateMemberBalanceClient,
  type AdminMember,
} from "@/lib/admin-memberships-api";
import { Founder30LinksPanel } from "./founder30-links-panel";

export function MembershipsPanel() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [plan, setPlan] = useState<"all" | "standard" | "founder30">("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMembershipsClient({ plan, page, limit: 20 });
      setMembers(res.members);
      setPages(res.pagination.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load memberships");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [plan, page]);

  async function handleInvite(userId: string, invited = true) {
    setBusyId(userId);
    try {
      await inviteFounder30Client(userId, invited);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOverage(userId: string, overageHours: number) {
    if (!window.confirm(`Charge ${overageHours.toFixed(1)} overage hours to this member's saved card?`)) return;
    setBusyId(userId);
    try {
      await chargeMemberOverageClient(userId, overageHours);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Overage charge failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdjustBalance(userId: string) {
    const yearMonth = window.prompt("Year-month to adjust (YYYY-MM)", new Date().toISOString().slice(0, 7));
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return;
    const raw = window.prompt("Set totalHoursUsed for that month", "0");
    if (raw == null) return;
    const totalHoursUsed = Number(raw);
    if (!Number.isFinite(totalHoursUsed) || totalHoursUsed < 0) {
      setError("totalHoursUsed must be a non-negative number");
      return;
    }
    setBusyId(userId);
    try {
      await updateMemberBalanceClient(userId, { yearMonth, totalHoursUsed });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Memberships</h2>
        <p className="mt-1 text-sm text-muted">Active subscribers, Founder 30 invites, and overage billing</p>
      </div>

      <Founder30LinksPanel />

      <div className="flex flex-wrap gap-2">
        {(["all", "standard", "founder30"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setPlan(p); setPage(1); }}
            className={`rounded-xl border px-4 py-2 text-sm capitalize transition-colors ${
              plan === p ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted hover:text-text"
            }`}
          >
            {p === "founder30" ? "Founder 30" : p}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading members…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Hours (Q)</th>
                <th className="px-4 py-3">Overage</th>
                <th className="px-4 py-3">Card</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">No members found</td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.userId} className="border-b border-border/50 text-text">
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name || "—"}</p>
                      <p className="text-xs text-muted">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {m.isFounder30 ? "Founder 30" : m.plan} · ${m.ratePerHour}/hr
                    </td>
                    <td className="px-4 py-3">
                      {m.hoursUsed.toFixed(1)} / {m.quarterlyHours}h
                      <span className="block text-xs text-muted">{m.hoursRemaining.toFixed(1)}h left</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.overageHours > 0 ? (
                        <>
                          {m.overageHours.toFixed(1)}h
                          <span className="block text-xs text-amber-400">${m.overageCharge.toFixed(2)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{m.savedCardLast4 ? `•••• ${m.savedCardLast4}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!m.isFounder30 && (
                          <button
                            type="button"
                            disabled={busyId === m.userId}
                            onClick={() => handleInvite(m.userId, true)}
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:border-gold/40 disabled:opacity-50"
                          >
                            Invite F30
                          </button>
                        )}
                        {m.isFounder30 && (
                          <button
                            type="button"
                            disabled={busyId === m.userId}
                            onClick={() => handleInvite(m.userId, false)}
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:border-red-500/40 disabled:opacity-50"
                          >
                            Revoke F30
                          </button>
                        )}
                        {m.overageHours > 0 && (
                          <button
                            type="button"
                            disabled={busyId === m.userId}
                            onClick={() => handleOverage(m.userId, m.overageHours)}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 disabled:opacity-50"
                          >
                            Charge overage
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === m.userId}
                          onClick={() => handleAdjustBalance(m.userId)}
                          className="rounded-lg border border-border px-2 py-1 text-xs hover:border-gold/40 disabled:opacity-50"
                        >
                          Adjust hours
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">Prev</button>
          <span>{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
