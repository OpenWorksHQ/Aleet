"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { createSetupIntent } from "@/lib/api/payments";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/app/components/ui";
import type { Stripe } from "@stripe/stripe-js";

type InnerProps = {
  onSuccess: () => void;
  onCancel?: () => void;
};

function SetupForm({ onSuccess, onCancel }: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to save card");
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!elementReady && (
        <div className="flex items-center gap-2 py-4 text-aleet-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading card fields…</span>
        </div>
      )}
      <div className={elementReady ? "block" : "min-h-[1px]"}>
        <PaymentElement
          options={{ layout: "tabs" }}
          onReady={() => setElementReady(true)}
          onLoadError={(event) => {
            setError(
              event.error?.message ??
                "Stripe card form failed to load. Check that NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY matches the backend secret key account.",
            );
          }}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!stripe || !elementReady || busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save card"
          )}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-aleet-border px-4 py-2 text-sm text-aleet-text-muted hover:text-aleet-text"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

type Props = {
  onSuccess: () => void;
  onCancel?: () => void;
};

export function AddCardForm({ onSuccess, onCancel }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setLoadError(
        "Stripe is not configured on this site (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY). Add the client test publishable key in Vercel and redeploy.",
      );
      setStripe(null);
      return;
    }

    getStripe()
      .then((instance) => {
        if (!instance) {
          setLoadError("Failed to initialize Stripe.js. Check the publishable key on Vercel.");
          setStripe(null);
          return;
        }
        setStripe(instance);
      })
      .catch(() => {
        setLoadError("Failed to load Stripe.js");
        setStripe(null);
      });
  }, []);

  useEffect(() => {
    if (loadError) return;
    const token = getToken() ?? undefined;
    createSetupIntent(token)
      .then((res) => {
        if (res.data?.clientSecret) setClientSecret(res.data.clientSecret);
        else setLoadError("Could not start card setup");
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Could not start card setup");
      });
  }, [loadError]);

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>;
  }

  if (!clientSecret || stripe === undefined) {
    return (
      <div className="flex items-center gap-2 py-6 text-aleet-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading secure form…</span>
      </div>
    );
  }

  if (!stripe) {
    return (
      <p className="text-sm text-red-400">
        Stripe could not start. Confirm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set on Vercel.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#c5a386",
            colorBackground: "#1a1816",
            colorText: "#f5f0ea",
            borderRadius: "12px",
          },
        },
      }}
    >
      <SetupForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
