"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "../components/dashboard-shell";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  MEMBERSHIP_SAVINGS,
  STANDARD_MEMBERSHIP_PLAN,
} from "@/lib/membership-plans";
import {
  cancelSubscription,
  chargeSubscriptionSavedCard,
  createSubscriptionCheckout,
  getSubscriptionBenefits,
  getSubscriptionStatus,
  type SubscriptionBenefits,
  type SubscriptionStatus,
} from "@/lib/api/subscriptions";
import { listSavedCards, type SavedCard } from "@/lib/api/payments";
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
      setError(
        err instanceof ApiError ? err.message : "Failed to load subscription",
      );
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
  const showFounder30 = !!status?.founder30Invited && !isSubscriber;

  async function handleCheckout(plan: "standard" | "founder30" = "standard") {
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

  async function handleChargeSaved(plan: "standard" | "founder30" = "standard") {
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
      await chargeSubscriptionSavedCard(
        { plan, paymentMethodId: card.id },
        token,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (
      !window.confirm(
        "Cancel membership? Remaining prepaid hours stay until the billing period ends.",
      )
    ) {
      return;
    }
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

  const usagePct =
    isSubscriber && status
      ? Math.min(
          (status.currentQuarter.hoursUsed /
            Math.max(status.currentQuarter.totalHoursIncluded, 1)) *
            100,
          100,
        )
      : 0;

  return (
    <DashboardShell activeNav="subscription">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-aleet-text sm:text-3xl">
            Subscription
          </h1>
          <p className="mt-1 text-sm text-aleet-text-muted">
            Prepaid hours at member rates — any vehicle
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {isSubscriber && status ? (
          <div className="rounded-2xl border border-aleet-gold/30 bg-aleet-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-aleet-gold">
                  Active membership
                </p>
                <h2 className="mt-1 font-serif text-2xl text-aleet-text">
                  {status.isFounder30 ? "Founder 30" : "Standard Membership"} ·
                  ${status.ratePerHour}/hr
                </h2>
                <p className="mt-1 text-sm text-aleet-text-muted">
                  Billed quarterly · Next billing{" "}
                  {status.nextBillingDate
                    ? new Date(status.nextBillingDate).toLocaleDateString()
                    : "—"}
                </p>
                {status.savedCardLast4 ? (
                  <p className="mt-1 text-xs text-aleet-text-subtle">
                    Card •••• {status.savedCardLast4}
                  </p>
                ) : null}
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
                  {status.currentQuarter.hoursUsed.toFixed(1)} /{" "}
                  {status.currentQuarter.totalHoursIncluded}h
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-aleet-cream">
                <div
                  className="h-full rounded-full bg-aleet-gold transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {status.currentQuarter.overageHours > 0 ? (
                <p className="mt-2 text-sm text-amber-400">
                  Overage: {status.currentQuarter.overageHours.toFixed(1)}h (~$
                  {status.currentQuarter.overageCharge.toFixed(2)})
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
            <h2 className="mb-6 text-center text-xl font-medium text-aleet-text">
              Member savings vs regular pricing
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {standard ? (
                <PlanCard
                  title="Standard Membership"
                  tag={STANDARD_MEMBERSHIP_PLAN.tag}
                  features={STANDARD_MEMBERSHIP_PLAN.features}
                  plan={standard}
                  monthlyDisplay={standard.monthlyCharge}
                  busy={busy}
                  onCheckout={() => handleCheckout("standard")}
                  onSavedCard={() => handleChargeSaved("standard")}
                  hasCard={cards.length > 0}
                />
              ) : null}

              {showFounder30 && founder30 ? (
                <PlanCard
                  title="Founder 30"
                  tag="Invite only"
                  features={[
                    "Private invite-only rate — $69/hr any vehicle",
                    "5 prepaid hours every month",
                    "Same booking benefits as Standard",
                    "Overage stays at your Founder rate",
                  ]}
                  plan={founder30}
                  monthlyDisplay={founder30.monthlyCharge}
                  busy={busy}
                  onCheckout={() => handleCheckout("founder30")}
                  onSavedCard={() => handleChargeSaved("founder30")}
                  hasCard={cards.length > 0}
                />
              ) : (
                <div className="flex flex-col justify-center space-y-3">
                  <p className="text-base font-medium text-aleet-text">
                    Your savings breakdown
                  </p>
                  {MEMBERSHIP_SAVINGS.map((item) => (
                    <div
                      key={item.vehicle}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-aleet-border bg-aleet-cream px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-aleet-text">
                          {item.vehicle}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-sm text-aleet-text-subtle line-through">
                            ${item.regularPrice}/hr
                          </span>
                          <span className="text-sm font-semibold text-aleet-gold">
                            ${item.memberPrice}/hr
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-aleet-border bg-aleet-cream px-3 py-1 text-xs font-semibold text-aleet-text-muted">
                        Save ${item.savings}/hr
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isSubscriber ? (
          <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-aleet-text">Payment method</h3>
              {!showAddCard ? (
                <button
                  type="button"
                  onClick={() => setShowAddCard(true)}
                  className="text-sm text-aleet-gold hover:underline"
                >
                  Add card
                </button>
              ) : null}
            </div>
            {showAddCard ? (
              <AddCardForm
                onSuccess={() => {
                  setShowAddCard(false);
                  load();
                }}
                onCancel={() => setShowAddCard(false)}
              />
            ) : cards.length === 0 ? (
              <p className="text-sm text-aleet-text-muted">
                Add a card to subscribe without leaving the site.
              </p>
            ) : (
              <p className="text-sm text-aleet-text-muted">
                {cards.length} saved card{cards.length !== 1 ? "s" : ""} on
                file.
              </p>
            )}
          </div>
        ) : null}

        <p className="text-sm text-aleet-text-muted">
          Manage cards on{" "}
          <Link href="/billing" className="text-aleet-gold hover:underline">
            Billing
          </Link>
          .
        </p>
      </div>
    </DashboardShell>
  );
}

function PlanCard({
  title,
  tag,
  features,
  plan,
  monthlyDisplay,
  busy,
  onCheckout,
  onSavedCard,
  hasCard,
}: {
  title: string;
  tag?: string;
  features: string[];
  plan: {
    ratePerHour: number;
    monthlyHours: number;
    monthlyCharge?: number;
    quarterlyCharge: number;
    description: string;
  };
  monthlyDisplay?: number;
  busy: boolean;
  onCheckout: () => void;
  onSavedCard: () => void;
  hasCard: boolean;
}) {
  const monthly = monthlyDisplay ?? plan.monthlyCharge ?? plan.ratePerHour * plan.monthlyHours;

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl p-6 text-white",
      )}
      style={{
        background:
          "linear-gradient(145deg, #d4b896 0%, #c5a386 45%, #9a7d62 100%)",
      }}
    >
      {tag ? (
        <span className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {tag}
        </span>
      ) : null}

      <p className="text-center font-serif text-2xl font-semibold text-white/95">
        {title}
      </p>

      <p className="mt-4 text-center text-sm font-semibold uppercase tracking-wide text-white/80">
        Initial monthly membership
      </p>
      <p className="mt-2 text-center">
        <span className="text-5xl font-bold text-white">${monthly}</span>
        <span className="text-lg text-white/75">/mo</span>
      </p>
      <p className="mt-3 text-center text-sm text-white/75">
        ${plan.ratePerHour}/hr · {plan.monthlyHours} hrs included every month
      </p>
      <p className="mt-1 text-center text-xs text-white/60">
        Ongoing prepaid hours renew automatically while you stay on the plan
      </p>

      <ul className="mt-5 space-y-1">
        {features.map((feature) => (
          <li key={feature} className="text-sm text-white/75">
            &bull; {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onCheckout}
          className="cursor-pointer rounded-xl bg-aleet-text px-5 py-2.5 text-sm font-bold text-aleet-cream transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          Subscribe Now
        </button>
        {hasCard ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSavedCard}
            className="cursor-pointer rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Pay with saved card
          </button>
        ) : null}
      </div>
    </article>
  );
}
