"use client";

import { useOptimistic, useState, useTransition, useActionState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Plus, X } from "lucide-react";
import { createLead, moveLead } from "@/app/actions";
import type { Contact, Stage } from "@/lib/types";
import { ContactFields } from "@/components/contact-fields";

export type Card = { id: string; stage: Stage; title: string; who: string; value: number; source: string; age: string; hot: boolean; waiting: boolean };

const COLS: { key: Stage; label: string; hint: string }[] = [
  { key: "new", label: "New", hint: "Answer fast" },
  { key: "contacted", label: "Talking", hint: "Book the visit" },
  { key: "quoted", label: "Quoted", hint: "Being followed up" },
  { key: "won", label: "Won", hint: "" },
  { key: "lost", label: "Lost", hint: "" },
];

const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : `$${n}`);

export function Board({ cards }: { cards: Card[] }) {
  const [optimistic, move] = useOptimistic(cards, (state, { id, stage }: { id: string; stage: Stage }) => state.map((c) => (c.id === id ? { ...c, stage } : c)));
  const [, start] = useTransition();
  const [over, setOver] = useState<Stage | null>(null);
  const drop = (stage: Stage, id: string) =>
    start(async () => {
      move({ id, stage });
      await moveLead(id, stage);
    });
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[980px] grid-cols-5 gap-3">
        {COLS.map((col) => {
          const list = optimistic.filter((c) => c.stage === col.key);
          const total = list.reduce((s, c) => s + c.value, 0);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                setOver(null);
                drop(col.key, e.dataTransfer.getData("text/plain"));
              }}
              className={clsx("flex min-h-[420px] flex-col rounded-2xl bg-[#f3f1ec] p-2 transition", over === col.key && "ring-2 ring-sun")}
            >
              <div className="flex items-baseline justify-between px-2 pt-1.5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={clsx("size-2 rounded-full", col.key === "new" ? "bg-red" : col.key === "won" ? "bg-ink" : col.key === "lost" ? "bg-faint" : "bg-sun")} />
                  <span className="text-[13px] font-semibold">{col.label}</span>
                  <span className="num text-[12px] text-muted">{list.length}</span>
                </div>
                <span className="num text-[12px] font-semibold text-ink-2">{fmt(total)}</span>
              </div>
              <div className="flex-1 space-y-2">
                {list.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/pipeline?lead=${c.id}`}
                    scroll={false}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className={clsx("block cursor-grab rounded-xl bg-paper p-3 shadow-[var(--shadow-card)] ring-1 ring-line transition hover:ring-line-2 active:cursor-grabbing", c.waiting && "ring-red-line")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] leading-snug font-semibold">{c.who}</span>
                      <span className="num shrink-0 text-[12.5px] font-semibold text-ink-2">{fmt(c.value)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{c.title}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
                      <span className="rounded-md bg-canvas px-1.5 py-0.5 font-medium text-ink-2 ring-1 ring-line">{c.source}</span>
                      <span className={clsx(c.waiting ? "font-semibold text-red" : "text-faint")}>{c.waiting ? `Waiting ${c.age}` : c.age}</span>
                    </div>
                  </Link>
                ))}
                {col.hint && list.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-faint">{col.hint}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AddLead({ contacts }: { contacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: unknown, form: FormData) => {
    const r = await createLead(prev, form);
    if (r && "ok" in r && r.ok) setOpen(false);
    return r;
  }, null);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add lead
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => setOpen(false)}>
          <form action={action} className="card w-full max-w-lg space-y-4 p-6 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">New lead</h2>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <ContactFields contacts={contacts} />
            <div>
              <label className="label" htmlFor="lt">What do they need?</label>
              <input id="lt" name="title" className="field" placeholder="e.g. AC not cooling upstairs" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="ls">Source</label>
                <select id="ls" name="source" className="field">
                  {["Phone", "Website", "Google", "Referral", "Yelp", "Walk-in"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="lv">Rough value</label>
                <input id="lv" name="value" className="field num" inputMode="numeric" placeholder="$" />
              </div>
            </div>
            <textarea name="notes" className="field" rows={2} placeholder="Notes (optional)" />
            {state && "error" in state && <p className="text-[13px] text-red">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={pending}>
                Add lead
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function StageSelect({ id, stage }: { id: string; stage: Stage }) {
  const [pending, start] = useTransition();
  return (
    <select className="field h-9 w-auto" disabled={pending} defaultValue={stage} onChange={(e) => start(() => moveLead(id, e.target.value as Stage))} aria-label="Stage">
      {COLS.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
