import type { ApiBookingStatus, ApiPaymentStatus } from "@/lib/admin-api";

export type TripStatus = ApiBookingStatus;
export type PaymentStatus = ApiPaymentStatus;

export const STATUS_LABELS: Record<TripStatus, string> = {
  Pending: "Pending",
  Confirmed: "Confirmed",
  "In Progress": "In Progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Expired: "Expired",
};

export const STATUS_COLORS: Record<TripStatus, string> = {
  Pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  Confirmed: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  "In Progress": "border-violet-500/40 bg-violet-500/10 text-violet-400",
  Completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  Cancelled: "border-red-500/40 bg-red-500/10 text-red-400",
  Expired: "border-border bg-border/20 text-muted",
};

export const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  Unpaid: "border-red-500/40 bg-red-500/10 text-red-400",
  Paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  Refunded: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  Failed: "border-red-500/40 bg-red-500/10 text-red-400",
};
