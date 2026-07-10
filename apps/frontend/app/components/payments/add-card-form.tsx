"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { createSetupIntent } from "@/lib/api/payments";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/app/components/ui";

type InnerProps = {
  onSuccess: () => void;
  onCancel?: () => void;
};

function SetupForm({ onSuccess, onCancel }: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!stripe || busy}>
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() ?? undefined;
    createSetupIntent(token)
      .then((res) => {
        if (res.data?.clientSecret) setClientSecret(res.data.clientSecret);
        else setLoadError("Could not start card setup");
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Could not start card setup");
      });
  }, []);

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>;
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-2 py-6 text-aleet-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading secure form…</span>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
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
