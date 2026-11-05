"use client";

import { useState, useTransition } from "react";
import { DollarSign } from "lucide-react";
import { recordPayment } from "@/app/actions";

export function RecordPayment({ id, balance }: { id: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(balance.toFixed(2));
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <DollarSign size={15} /> Record payment
      </button>
    );
  return (
    <div className="flex items-center gap-2 rounded-xl bg-paper p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-line">
      <span className="pl-2 text-muted">$</span>
      <input className="field num h-8 w-28 border-0 px-1 focus:shadow-none" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus aria-label="Amount received" />
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { await recordPayment(id, Number(amt)); setOpen(false); })}>
        Save
      </button>
      <button className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
