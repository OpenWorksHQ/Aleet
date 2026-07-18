import { apiFetch } from "@/lib/api";

export type PlanBenefits = {
  ratePerHour: number;
  monthlyHours: number;
  quarterlyHours: number;
  monthlyCharge: number;
  quarterlyCharge: number;
  description: string;
  inviteOnly?: boolean;
};

export type SubscriptionBenefits = {
  standard: PlanBenefits;
  founder30: PlanBenefits;
};

export type SubscriptionStatus = {
  status: string;
  plan: string | null;
  isFounder30: boolean;
  founder30Invited?: boolean;
  ratePerHour: number | null;
  monthlyCharge?: number | null;
  quarterlyCharge: number | null;
  currentQuarter: {
    totalHoursIncluded: number;
    hoursUsed: number;
    hoursRemaining: number;
    overageHours: number;
    overageCharge: number;
  };
  subscriptionDetails: {
    plan?: string;
    price?: number;
    billingCycle?: string;
    startDate?: string;
    nextBillingDate?: string;
    isActive?: boolean;
    monthlyHoursIncluded?: number;
  } | null;
  nextBillingDate: string | null;
  savedCardLast4: string | null;
};

export type SubscriptionCheckoutData = {
  url: string;
  sessionId: string;
  plan: string;
  ratePerHour: number;
  monthlyHours: number;
  quarterlyHours: number;
  monthlyCharge?: number;
  quarterlyCharge: number;
  message?: string;
};

export function getSubscriptionBenefits() {
  return apiFetch<SubscriptionBenefits>("/subscriptions/benefits");
}

export function getSubscriptionStatus(token?: string) {
  return apiFetch<SubscriptionStatus>("/subscriptions/status", { token });
}

export function createSubscriptionCheckout(
  plan: "standard" | "founder30" = "standard",
  token?: string,
) {
  return apiFetch<SubscriptionCheckoutData>("/subscriptions/checkout", {
    method: "POST",
    body: { plan },
    token,
  });
}

export function chargeSubscriptionSavedCard(
  body: { plan?: "standard" | "founder30"; paymentMethodId: string },
  token?: string,
) {
  return apiFetch<{ subscription: Record<string, unknown> }>(
    "/subscriptions/charge-saved-card",
    {
      method: "POST",
      body,
      token,
    },
  );
}

export function cancelSubscription(token?: string) {
  return apiFetch("/subscriptions/cancel", { method: "POST", token });
}

export function processSubscriptionPayment(sessionId: string, token?: string) {
  return apiFetch("/subscriptions/process-payment", {
    method: "POST",
    body: { sessionId },
    token,
  });
}
