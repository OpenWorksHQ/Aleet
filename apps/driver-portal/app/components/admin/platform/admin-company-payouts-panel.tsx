"use client";

import { useState } from "react";

/**
 * Company retained-payment transfers → business bank.
 * UI stub for ops; Azeem wires real transfer backend later.
 */
export function AdminCompanyPayoutsPanel() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Enter a valid amount greater than 0.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Placeholder until company bank transfer API is ready.
      await new Promise((r) => setTimeout(r, 600));
      setMessage(
        `Transfer of $${parsed.toFixed(2)} queued (UI only). Backend wiring pending.`,
      );
      setAmount("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
        <h3 className="text-base font-semibold text-text">Company bank transfer</h3>
        <p className="mt-1 text-sm text-muted">
          Move retained platform payments to the business bank account. Transfer
          execution will be connected by backend.
        </p>

        <form onSubmit={handleTransfer} className="mt-5 grid max-w-lg gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Amount (USD)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-11 w-full rounded-xl border border-border bg-page-bg px-3 text-sm text-text outline-none focus:border-gold/40"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Note (optional)
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Weekly retention sweep — week of Jul 20"
              className="w-full resize-none rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none focus:border-gold/40"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
          >
            {busy ? "Queuing…" : "Transfer to business account"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
            {message}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card-bg/60 px-5 py-8 text-center">
        <p className="text-sm text-muted">
          Transfer history will appear here once the payout API is connected.
        </p>
      </div>
    </div>
  );
}
