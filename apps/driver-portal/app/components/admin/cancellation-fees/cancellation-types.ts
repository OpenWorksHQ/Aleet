export type CancellationFeeStatus = "charged" | "pending" | "waived";
export type CancellationReason =
  | "driver_noshow"
  | "late_cancellation"
  | "rider_cancellation"
  | "other";

export type CancellationFee = {
  id: string;
  driverName: string;
  riderName: string;
  amount: number;
  reason: CancellationReason;
  status: CancellationFeeStatus;
  date: string;
  tripId?: string;
};

export const FEE_STATUS_LABELS: Record<CancellationFeeStatus, string> = {
  charged: "Charged",
  pending: "Pending",
  waived: "Waived",
};

export const FEE_STATUS_COLORS: Record<CancellationFeeStatus, string> = {
  charged: "border-gold/40 bg-gold/10 text-gold",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  waived: "border-border bg-border/20 text-muted",
};

export const REASON_LABELS: Record<CancellationReason, string> = {
  driver_noshow: "Driver no-show",
  late_cancellation: "Late cancellation",
  rider_cancellation: "Rider cancellation",
  other: "Other",
};

export const mockCancellationFees: CancellationFee[] = [
  {
    id: "1",
    driverName: "John Smith",
    riderName: "Alice Brown",
    amount: 5.0,
    reason: "driver_noshow",
    status: "charged",
    date: "2024-01-15",
  },
  {
    id: "2",
    driverName: "Sarah Johnson",
    riderName: "Bob Wilson",
    amount: 3.5,
    reason: "late_cancellation",
    status: "pending",
    date: "2024-01-14",
  },
  {
    id: "3",
    driverName: "Mike Davis",
    riderName: "Carol Lee",
    amount: 5.0,
    reason: "driver_noshow",
    status: "charged",
    date: "2024-01-13",
  },
  {
    id: "4",
    driverName: "Lisa Wilson",
    riderName: "David Kim",
    amount: 2.0,
    reason: "rider_cancellation",
    status: "waived",
    date: "2024-01-12",
  },
  {
    id: "5",
    driverName: "Carlos Rivera",
    riderName: "Emma Stone",
    amount: 5.0,
    reason: "late_cancellation",
    status: "charged",
    date: "2024-01-11",
  },
  {
    id: "6",
    driverName: "James Walker",
    riderName: "Frank Chen",
    amount: 3.5,
    reason: "driver_noshow",
    status: "pending",
    date: "2024-01-10",
  },
];
