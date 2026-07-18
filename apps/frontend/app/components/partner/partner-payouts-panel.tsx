"use client";

import { useEffect, useState } from "react";
import { getPartnerPayoutMe, savePartnerPayoutMe } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import type { PartnerDashboardStats, PartnerPayoutAccount } from "@/lib/partner/types";
import { toast } from "@/app/components/ui";
import { partnerAuthInputClass } from "@/app/components/partner/partner-auth-card";

type Props = {
  stats: PartnerDashboardStats;
};

export function PartnerPayoutsPanel({ stats }: Props) {
  const [payout, setPayout] = useState<PartnerPayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<"paypal" | "bank">("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");
  const [routingLast4, setRoutingLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPartnerPayoutMe()
      .then((res) => {
        if (cancelled || !res.data) return;
        setPayout(res.data);
        if (res.data.method === "bank" || res.data.method === "paypal") {
          setMethod(res.data.method);
        }
        setPaypalEmail(res.data.paypalEmail || "");
        setAccountHolderName(res.data.accountHolderName || "");
        setBankName(res.data.bankName || "");
        setAccountLast4(res.data.accountLast4 || "");
        setRoutingLast4(res.data.routingLast4 || "");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load payout settings.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await savePartnerPayoutMe(
        method === "paypal"
          ? { method: "paypal", paypalEmail, accountHolderName }
          : {
              method: "bank",
              accountHolderName,
              bankName,
              accountLast4,
              routingLast4,
            },
      );
      setPayout(res.data ?? null);
      toast.success("Payout details saved.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save payout details.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const commissionPct = payout?.commissionPct ?? stats.commissionPct;
  const pending = payout?.pendingPayout ?? stats.pendingPayout;
  const lifetime = payout?.lifetimeEarnings ?? stats.lifetimeEarnings;

  return (
    <section className="rounded-2xl border border-aleet-gold/30 bg-aleet-card p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-aleet-gold">
        Partner payouts
      </p>
      <h2 className="mt-2 font-serif text-xl text-aleet-text">Bank &amp; earnings payout</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-aleet-text-muted">
        Connect where you want to receive your commission (
        <strong>{commissionPct}%</strong> of completed bookings assigned by Admin).
        Save PayPal or bank details here. Stripe Connect bank onboarding can be added when
        the platform Connect account is fully configured.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
            Pending payout
          </p>
          <p className="mt-1 text-xl font-semibold text-aleet-gold">${pending.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
            Lifetime earnings
          </p>
          <p className="mt-1 text-xl font-semibold text-aleet-text">${lifetime.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-[13px] text-aleet-text-muted">Loading payout settings…</p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSave(e)}>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
              Payout method
            </p>
            <div className="flex gap-2">
              {(["paypal", "bank"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-lg border px-3 py-2 text-[13px] font-medium capitalize ${
                    method === m
                      ? "border-aleet-gold bg-aleet-gold/10 text-aleet-gold"
                      : "border-aleet-border text-aleet-text-muted"
                  }`}
                >
                  {m === "paypal" ? "PayPal" : "Bank account"}
                </button>
              ))}
            </div>
          </div>

          {method === "paypal" ? (
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-aleet-text-muted">PayPal email</span>
              <input
                type="email"
                required
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className={partnerAuthInputClass}
                placeholder="you@business.com"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-aleet-text-muted">Account holder</span>
                <input
                  type="text"
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className={partnerAuthInputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-aleet-text-muted">Bank name</span>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={partnerAuthInputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-aleet-text-muted">Routing (last 4)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={routingLast4}
                    onChange={(e) => setRoutingLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={partnerAuthInputClass}
                    placeholder="1234"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-aleet-text-muted">Account (last 4)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={accountLast4}
                    onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={partnerAuthInputClass}
                    placeholder="5678"
                  />
                </label>
              </div>
            </>
          )}

          {payout?.status === "connected" ? (
            <p className="text-[12px] text-emerald-700">
              Connected via {payout.method === "paypal" ? "PayPal" : "bank"}
              {payout.updatedAt
                ? ` · updated ${new Date(payout.updatedAt).toLocaleDateString()}`
                : ""}
            </p>
          ) : (
            <p className="text-[12px] text-aleet-text-subtle">No payout method connected yet.</p>
          )}

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-aleet-gold px-4 py-2.5 text-[13px] font-semibold text-aleet-text disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save payout details"}
          </button>
        </form>
      )}
    </section>
  );
}
