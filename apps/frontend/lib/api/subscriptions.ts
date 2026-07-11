import { apiFetch } from "@/lib/api";

export type SubscriptionPlanBenefit = {
  ratePerHour: number;
  monthlyHours: number;
  quarterlyHours: number;
  monthlyCharge: number;
  quarterlyCharge: number;
  description: string;
  inviteOnly?: boolean;
};

export type SubscriptionBenefits = {
  standard: SubscriptionPlanBenefit;
  founder30: SubscriptionPlanBenefit;
};

export type SubscriptionStatus = {
  status: string;
  plan: string | null;
  isFounder30: boolean;
  ratePerHour: number | null;
  quarterlyCharge: number | null;
  currentQuarter: {
    totalHoursIncluded: number;
    hoursUsed: number;
    hoursRemaining: number;
    overageHours: number;
    overageCharge: number;
  };
  nextBillingDate: string | null;
  savedCardLast4: string | null;
};

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export function getSubscriptionBenefits() {
  return apiFetch<SubscriptionBenefits>("/subscriptions/benefits");
}

export function getSubscriptionStatus(token?: string) {
  return apiFetch<SubscriptionStatus>("/subscriptions/status", { token });
}

export function createSubscriptionCheckout(
  plan: "standard" | "founder30",
  token?: string,
) {
  return apiFetch<{ url: string }>("/subscriptions/checkout", {
    method: "POST",
    body: { plan },
    token,
  });
}

export function chargeSubscriptionSavedCard(
  body: { plan: "standard" | "founder30"; paymentMethodId: string },
  token?: string,
) {
  return apiFetch("/subscriptions/charge-saved-card", {
    method: "POST",
    body,
    token,
  });
}

export function cancelSubscription(token?: string) {
  return apiFetch("/subscriptions/cancel", {
    method: "POST",
    token,
  });
}

export function listSavedCards(token?: string) {
  return apiFetch<SavedCard[]>("/payments/saved-cards", { token });
}
