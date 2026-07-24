"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui";
import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  confirmBookingPayment,
  createBookingPaymentIntent,
} from "@/lib/api/payments";
import { getStripe } from "@/lib/stripe";

type PaymentFormProps = {
  bookingId: string;
  paymentIntentId: string;
  onPaid: () => void;
};

function PaymentForm({ bookingId, paymentIntentId, onPaid }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/booking-success?booking_id=${encodeURIComponent(bookingId)}`,
        },
      });
      if (result.error) {
        setError(result.error.message ?? "Payment failed");
        return;
      }
      if (result.paymentIntent?.status !== "succeeded") {
        setError("Payment was not completed.");
        return;
      }

      await confirmBookingPayment(paymentIntentId, getToken() ?? undefined);
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!ready && (
        <div className="flex items-center gap-2 py-4 text-aleet-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading secure card fields…</span>
        </div>
      )}
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setReady(true)}
        onLoadError={(event) => setError(event.error?.message ?? "Card form failed to load")}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={!stripe || !ready || busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming payment…
          </>
        ) : (
          "Pay & Confirm Trip"
        )}
      </Button>
      <p className="text-center text-xs text-aleet-text-subtle">
        This card will be securely saved for future one-tap bookings.
      </p>
    </form>
  );
}

type Props = {
  bookingId: string;
  amount: number;
  onPaid: () => void;
};

export function InlineBookingPaymentForm({ bookingId, amount, onPaid }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getStripe(),
      createBookingPaymentIntent({ bookingId }, getToken() ?? undefined),
    ])
      .then(([stripeInstance, response]) => {
        if (!active) return;
        if (!stripeInstance) throw new Error("Stripe is not configured.");
        if (!response.data?.clientSecret || !response.data.paymentIntentId) {
          throw new Error("Could not start payment.");
        }
        setStripe(stripeInstance);
        setClientSecret(response.data.clientSecret);
        setPaymentIntentId(response.data.paymentIntentId);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not start payment");
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!stripe || !clientSecret || !paymentIntentId) {
    return (
      <div className="flex items-center gap-2 py-5 text-aleet-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Preparing secure payment…</span>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-aleet-gold/30 bg-aleet-card p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl text-aleet-text">Payment details</h3>
          <p className="text-xs text-aleet-text-muted">Your trip is sent to drivers only after payment.</p>
        </div>
        <span className="text-xl font-semibold text-aleet-gold">${amount.toFixed(2)}</span>
      </div>
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
        <PaymentForm bookingId={bookingId} paymentIntentId={paymentIntentId} onPaid={onPaid} />
      </Elements>
    </div>
  );
}
