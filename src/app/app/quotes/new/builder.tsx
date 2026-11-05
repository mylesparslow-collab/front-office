"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2 } from "lucide-react";
import { saveQuote } from "@/app/actions";
import type { Contact, LineItem } from "@/lib/types";
import { money } from "@/lib/format";

export function QuoteBuilder({ contacts, lead }: { contacts: Contact[]; lead?: { id: string; title: string; contact_id: string | null; value: number } }) {
  const router = useRouter();
  const [contactId, setContactId] = useState(lead?.contact_id ?? contacts[0]?.id ?? "");
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
  const [mode, setMode] = useState<"existing" | "new">(contacts.length ? "existing" : "new");
  const [title, setTitle] = useState(lead?.title ?? "");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, unit: lead?.value ?? 0 }]);
  const [validDays, setValidDays] = useState(30);
  const [pending, start] = useTransition();
  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit) || 0), 0), [items]);

  const set = (i: number, patch: Partial<LineItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const submit = (send: boolean) =>
    start(async () => {
      const res = await saveQuote({
        contact: mode === "existing" ? { id: contactId } : newContact,
        leadId: lead?.id ?? null,
        title,
        items: items.map((i) => ({ description: i.description, qty: Number(i.qty), unit: Number(i.unit) })),
        validDays,
        send,
      });
      router.push(`/app/quotes/${res.id}`);
    });
  const valid = title.trim() && items.some((i) => i.description.trim()) && (mode === "existing" ? contactId : newContact.name.trim());

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="card space-y-5 p-6">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Customer</span>
            {contacts.length > 0 && (
              <button type="button" className="text-[12px] font-semibold text-red hover:underline" onClick={() => setMode(mode === "existing" ? "new" : "existing")}>
                {mode === "existing" ? "+ New customer" : "Pick existing"}
              </button>
            )}
          </div>
          {mode === "existing" ? (
            <select className="field" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="field" placeholder="Full name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <input className="field" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
              <input className="field" placeholder="Mobile" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="qt">Job</label>
          <input id="qt" className="field" placeholder="e.g. 3-ton AC replacement" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <div className="mb-1.5 grid grid-cols-[1fr_64px_110px_32px] gap-2 text-[11.5px] font-semibold text-muted">
            <span>Line item</span>
            <span>Qty</span>
            <span>Price</span>
            <span />
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_64px_110px_32px] gap-2">
                <input className="field" placeholder="Describe the part or labor" value={it.description} onChange={(e) => set(i, { description: e.target.value })} />
                <input className="field num px-2 text-center" inputMode="numeric" value={it.qty} onChange={(e) => set(i, { qty: e.target.value as unknown as number })} />
                <div className="relative">
                  <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px] text-muted">$</span>
                  <input className="field num pl-6" inputMode="decimal" value={it.unit} onChange={(e) => set(i, { unit: e.target.value as unknown as number })} />
                </div>
                <button type="button" className="btn btn-quiet h-10 px-0" aria-label="Remove line" onClick={() => setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-quiet btn-sm mt-2 -ml-2" onClick={() => setItems((xs) => [...xs, { description: "", qty: 1, unit: 0 }])}>
            <Plus size={14} /> Add line
          </button>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card p-5">
          <div className="eyebrow">Total</div>
          <div className="num mt-1 text-[32px] font-semibold tracking-tight">{money(total, { cents: true })}</div>
          <label className="label mt-4" htmlFor="vd">Price held for</label>
          <select id="vd" className="field" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))}>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
          <div className="mt-5 space-y-2">
            <button className="btn btn-primary w-full" disabled={!valid || pending} onClick={() => submit(true)}>
              <Send size={14} /> Send quote
            </button>
            <button className="btn btn-ghost w-full" disabled={!valid || pending} onClick={() => submit(false)}>
              Save draft
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-sun-soft p-4 text-[12.5px] leading-relaxed text-ink-2 ring-1 ring-sun-line">
          <span className="font-semibold text-ink">What happens next.</span> The customer gets a link to view and approve the quote online. If they go quiet, Front Office writes a check-in on day 2, a text on day 5, a price-hold reminder on day 9 and a close-the-loop note on day 14, each waiting for your OK.
        </div>
      </aside>
    </div>
  );
}
