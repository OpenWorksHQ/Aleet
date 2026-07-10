"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "../components/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  getSubscriptionBenefits,
  getSubscriptionStatus,
  createSubscriptionCheckout,
  chargeSubscriptionSavedCard,
  cancelSubscription,
  type SubscriptionBenefits,
  type SubscriptionStatus,
} from "@/lib/api/subscriptions";
import { listSavedCards, type SavedCard } from "@/lib/api/payments";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AddCardForm } from "@/app/components/payments/add-card-form";

export default function SubscriptionPage() {
  const [benefits, setBenefits] = useState<SubscriptionBenefits | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const [benefitsRes, statusRes, cardsRes] = await Promise.all([
        getSubscriptionBenefits(),
        getSubscriptionStatus(token),
        listSavedCards(token),
      ]);
      setBenefits(benefitsRes.data ?? null);
      setStatus(statusRes.data ?? null);
      setCards(cardsRes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isSubscriber = status?.status === "subscriber";
  const standard = benefits?.standard;
  const founder30 = benefits?.founder30;

  async function handleCheckout(plan: "standard" | "founder30") {
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const res = await createSubscriptionCheckout(plan, token);
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setError("Could not start checkout");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleChargeSaved(plan: "standard" | "founder30") {
    const card = cards.find((c) => c.isDefault) ?? cards[0];
    if (!card) {
      setShowAddCard(true);
      setError("Add a saved card first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      await chargeSubscriptionSavedCard({ plan, paymentMethodId: card.id }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel membership? Remaining prepaid hours stay until the billing period ends.")) return;
    setBusy(true);
    try {
      const token = getToken() ?? undefined;
      await cancelSubscription(token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell activeNav="subscription">
        <div className="flex items-center gap-2 py-20 text-aleet-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading subscription…
        </div>
      </DashboardShell>
    );
  }

  const usagePct = isSubscriber && status
    ? Math.min(
        (status.currentQuarter.hoursUsed / Math.max(status.currentQuarter.totalHoursIncluded, 1)) * 100,
        100,
      )
    : 0;

  return (
    <DashboardShell activeNav="subscription">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-aleet-text sm:text-3xl">Subscription</h1>
          <p className="mt-1 text-sm text-aleet-text-muted">Prepaid hours at member rates — any vehicle</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isSubscriber && status ? (
          <div className="rounded-2xl border border-aleet-gold/30 bg-aleet-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-aleet-gold">Active membership</p>
                <h2 className="mt-1 font-serif text-2xl text-aleet-text">
                  {status.isFounder30 ? "Founder 30" : "Standard"} · ${status.ratePerHour}/hr
                </h2>
                <p className="mt-1 text-sm text-aleet-text-muted">
                  Billed quarterly · Next billing{" "}
                  {status.nextBillingDate
                    ? new Date(status.nextBillingDate).toLocaleDateString()
                    : "—"}
                </p>
                {status.savedCardLast4 && (
                  <p className="mt-1 text-xs text-aleet-text-subtle">Card •••• {status.savedCardLast4}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="rounded-xl border border-aleet-border px-4 py-2 text-sm text-aleet-text-muted hover:text-aleet-text disabled:opacity-50"
              >
                Cancel membership
              </button>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-aleet-text-muted">Quarterly hours used</span>
                <span className="text-aleet-text">
                  {status.currentQuarter.hoursUsed.toFixed(1)} / {status.currentQuarter.totalHoursIncluded}h
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-aleet-cream">
                <div
                  className="h-full rounded-full bg-aleet-gold transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {status.currentQuarter.overageHours > 0 && (
                <p className="mt-2 text-sm text-amber-400">
                  Overage: {status.currentQuarter.overageHours.toFixed(1)}h (~$
                  {status.currentQuarter.overageCharge.toFixed(2)})
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {standard && (
              <PlanCard
                title="Standard Membership"
                plan={standard}
                highlight
                busy={busy}
                onCheckout={() => handleCheckout("standard")}
                onSavedCard={() => handleChargeSaved("standard")}
                hasCard={cards.length > 0}
              />
            )}
            {founder30 && (
              <PlanCard
                title="Founder 30"
                plan={founder30}
                inviteOnly
                busy={busy}
                onCheckout={() => handleCheckout("founder30")}
                onSavedCard={() => handleChargeSaved("founder30")}
                hasCard={cards.length > 0}
              />
            )}
          </div>
        )}

        {!isSubscriber && (
          <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-aleet-text">Payment method</h3>
              {!showAddCard && (
                <button
                  type="button"
                  onClick={() => setShowAddCard(true)}
                  className="text-sm text-aleet-gold hover:underline"
                >
                  Add card
                </button>
              )}
            </div>
            {showAddCard ? (
              <AddCardForm onSuccess={() => { setShowAddCard(false); load(); }} onCancel={() => setShowAddCard(false)} />
            ) : cards.length === 0 ? (
              <p className="text-sm text-aleet-text-muted">Add a card to subscribe without leaving the site.</p>
            ) : (
              <p className="text-sm text-aleet-text-muted">
                {cards.length} saved card{cards.length !== 1 ? "s" : ""} on file.
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-aleet-text-muted">
          Manage cards on <Link href="/billing" className="text-aleet-gold hover:underline">Billing</Link>.
        </p>
      </div>
    </DashboardShell>
  );
}

function PlanCard({
  title,
  plan,
  highlight,
  inviteOnly,
  busy,
  onCheckout,
  onSavedCard,
  hasCard,
}: {
  title: string;
  plan: { ratePerHour: number; monthlyHours: number; quarterlyCharge: number; description: string };
  highlight?: boolean;
  inviteOnly?: boolean;
  busy: boolean;
  onCheckout: () => void;
  onSavedCard: () => void;
  hasCard: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-6",
        highlight ? "border-aleet-gold/40 bg-aleet-card" : "border-aleet-border bg-aleet-card",
      )}
    >
      {inviteOnly && (
        <span className="mb-2 w-fit rounded-full bg-aleet-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-aleet-gold">
          Invite only
        </span>
      )}
      <h2 className="font-serif text-xl text-aleet-text">{title}</h2>
      <p className="mt-2">
        <span className="text-4xl font-bold text-aleet-gold">${plan.ratePerHour}</span>
        <span className="text-aleet-text-muted">/hr</span>
      </p>
      <p className="mt-1 text-sm text-aleet-text-muted">
        {plan.monthlyHours} hrs/month · ${plan.quarterlyCharge.toLocaleString()} billed quarterly
      </p>
      <p className="mt-3 flex-1 text-sm text-aleet-text-muted">{plan.description}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCheckout}
          className="rounded-xl bg-aleet-gold px-4 py-2.5 text-sm font-semibold text-aleet-text hover:opacity-90 disabled:opacity-50"
        >
          Subscribe via Checkout
        </button>
        {hasCard && (
          <button
            type="button"
            disabled={busy}
            onClick={onSavedCard}
            className="rounded-xl border border-aleet-gold/40 px-4 py-2.5 text-sm font-medium text-aleet-gold hover:bg-aleet-gold/10 disabled:opacity-50"
          >
            Pay with saved card
          </button>
        )}
      </div>
    </article>
  );
}
