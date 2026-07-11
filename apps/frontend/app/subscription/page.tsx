"use client";

import { useEffect, useState } from "react";
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
  listSavedCards,
  type SavedCard,
  type SubscriptionBenefits,
  type SubscriptionStatus,
} from "@/lib/api/subscriptions";

export default function SubscriptionPage() {
  const [benefits, setBenefits] = useState<SubscriptionBenefits | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const res = await createSubscriptionCheckout("standard", token);
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

  async function handleChargeSaved() {
    const card = cards.find((c) => c.isDefault) ?? cards[0];
    if (!card) {
      setError("Subscribe via checkout to save a card first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      await chargeSubscriptionSavedCard(
        { plan: "standard", paymentMethodId: card.id },
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
            Manage your membership plan and view savings
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {isSubscriber && status ? (
          <div className="space-y-6">
            <article className="rounded-2xl border border-aleet-gold/40 bg-aleet-card p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-aleet-gold">
                Active membership
              </p>
              <h2 className="mt-2 font-serif text-2xl text-aleet-text">
                {status.isFounder30 ? "Founder 30" : "Standard Membership"}
              </h2>
              <p className="mt-3 text-sm text-aleet-text-muted">
                Locked-in rate:{" "}
                <span className="font-semibold text-aleet-gold">
                  ${status.ratePerHour}/hr
                </span>
              </p>
              {status.nextBillingDate ? (
                <p className="mt-1 text-sm text-aleet-text-muted">
                  Next billing:{" "}
                  {new Date(status.nextBillingDate).toLocaleDateString()}
                </p>
              ) : null}
            </article>

            <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
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

            <button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="text-sm text-aleet-text-muted underline-offset-2 hover:text-aleet-text hover:underline disabled:opacity-50"
            >
              Cancel membership
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
            <h2 className="mb-6 text-center text-xl font-medium text-aleet-text">
              Member savings vs regular pricing
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {standard ? (
                <PlanCard
                  plan={standard}
                  busy={busy}
                  onCheckout={handleCheckout}
                  onSavedCard={handleChargeSaved}
                  hasCard={cards.length > 0}
                />
              ) : null}

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
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function PlanCard({
  plan,
  busy,
  onCheckout,
  onSavedCard,
  hasCard,
}: {
  plan: {
    ratePerHour: number;
    monthlyHours: number;
    quarterlyCharge: number;
    description: string;
  };
  busy: boolean;
  onCheckout: () => void;
  onSavedCard: () => void;
  hasCard: boolean;
}) {
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
      {STANDARD_MEMBERSHIP_PLAN.tag ? (
        <span className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {STANDARD_MEMBERSHIP_PLAN.tag}
        </span>
      ) : null}

      <p className="text-center font-serif text-2xl font-semibold text-white/95">
        Standard Membership
      </p>

      <p className="mt-4 text-center text-sm font-semibold uppercase tracking-wide text-white/80">
        Your locked-in member rate
      </p>
      <p className="mt-2 text-center">
        <span className="text-5xl font-bold text-white">
          ${plan.ratePerHour}
        </span>
        <span className="text-lg text-white/75">/hr on every ride</span>
      </p>
      <p className="mt-3 text-center text-sm text-white/75">
        {plan.monthlyHours} hours included every month · Save up to $111/hr vs
        standard rates
      </p>
      <p className="mt-1 text-center text-xs text-white/60">
        Billed quarterly at ${plan.quarterlyCharge.toLocaleString("en-US")}
      </p>

      <ul className="mt-5 space-y-1">
        {STANDARD_MEMBERSHIP_PLAN.features.map((feature) => (
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
