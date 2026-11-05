"use client";

import { useActionState } from "react";
import { createInvoice } from "@/app/actions";
import { ContactFields } from "@/components/contact-fields";
import type { Contact } from "@/lib/types";

export function NewInvoiceForm({ contacts }: { contacts: Contact[] }) {
  const [state, action, pending] = useActionState(createInvoice, null);
  return (
    <form action={action} className="card space-y-5 p-6">
      <ContactFields contacts={contacts} />
      <div>
        <label className="label" htmlFor="title">What was the work?</label>
        <input id="title" name="title" className="field" placeholder="e.g. Furnace repair, 2 hours + parts" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">Amount</label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">$</span>
            <input id="amount" name="amount" className="field num pl-7" inputMode="decimal" placeholder="0.00" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="terms">Payment due</label>
          <select id="terms" name="terms" className="field" defaultValue="15">
            <option value="0">On receipt</option>
            <option value="7">In 7 days</option>
            <option value="15">In 15 days</option>
            <option value="30">In 30 days</option>
          </select>
        </div>
      </div>
      {state?.error && <p className="text-[13px] font-medium text-red">{state.error}</p>}
      <div className="flex items-center justify-between border-t border-line pt-5">
        <p className="max-w-sm text-[12.5px] text-muted">Reminders start 3 days before the due date and stop the moment it&apos;s paid.</p>
        <button className="btn btn-primary" disabled={pending}>
          Create invoice
        </button>
      </div>
    </form>
  );
}
