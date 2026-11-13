"use client";

import { useActionState, useState, useTransition } from "react";
import clsx from "clsx";
import { Mail, MessageSquare, Plus, Trash2 } from "lucide-react";
import { saveCadence, updateBusiness } from "@/app/actions";
import type { Business, CadenceStep, SubjectType } from "@/lib/types";

const KIND_COPY: Record<SubjectType, { title: string; anchor: string }> = {
  invoice: { title: "Invoice reminders", anchor: "days from the due date" },
  quote: { title: "Quote follow-ups", anchor: "days after the quote is sent" },
  lead: { title: "New lead replies", anchor: "days after the lead comes in" },
};

export function CadenceEditor({ kind, initial }: { kind: SubjectType; initial: CadenceStep[] }) {
  const [steps, setSteps] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const set = (i: number, p: Partial<CadenceStep>) => {
    setSaved(false);
    setSteps((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  };
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold">{KIND_COPY[kind].title}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Placeholders: {"{{first}} {{owner}} {{business}} {{title}}"}
            {kind === "invoice" && " {{number}} {{balance}} {{due}} {{days_late}}"}
            {kind === "quote" && " {{number}} {{amount}} {{valid_until}}"}
          </p>
        </div>
        <button className="btn btn-dark btn-sm" disabled={pending} onClick={() => start(async () => { await saveCadence(kind, steps); setSaved(true); })}>
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <ol className="divide-y divide-line border-t border-line">
        {steps.map((s, i) => (
          <li key={i} className="grid gap-3 px-5 py-4 md:grid-cols-[150px_1fr]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="num flex size-6 items-center justify-center rounded-full bg-sun-soft text-[11px] font-bold text-sun-deep ring-1 ring-sun-line">{i + 1}</span>
                <input className="field num h-8 w-16 px-2 text-center" value={s.day} onChange={(e) => set(i, { day: Number(e.target.value) || 0 })} aria-label="Day offset" />
              </div>
              <p className="text-[11.5px] leading-snug text-muted">{KIND_COPY[kind].anchor}</p>
              <div className="flex rounded-lg bg-canvas p-0.5 ring-1 ring-line">
                {(["email", "sms"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => set(i, { channel: c })} className={clsx("flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[11.5px] font-semibold", s.channel === c ? "bg-paper text-ink shadow-sm ring-1 ring-line" : "text-muted")}>
                    {c === "sms" ? <MessageSquare size={11} /> : <Mail size={11} />}
                    {c === "sms" ? "Text" : "Email"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="field h-9 font-semibold" value={s.label} onChange={(e) => set(i, { label: e.target.value })} aria-label="Step name" />
                <button className="btn btn-quiet h-9 px-2" aria-label="Remove step" onClick={() => setSteps((xs) => xs.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
              {s.channel === "email" && <input className="field h-9" placeholder="Subject" value={s.subject ?? ""} onChange={(e) => set(i, { subject: e.target.value })} aria-label="Subject" />}
              <textarea className="field text-[13px]" rows={s.channel === "sms" ? 2 : 4} value={s.body} onChange={(e) => set(i, { body: e.target.value })} aria-label="Message" />
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t border-line px-5 py-3">
        <button className="btn btn-quiet btn-sm -ml-2" onClick={() => setSteps((xs) => [...xs, { day: (xs.at(-1)?.day ?? 0) + 7, channel: "email", label: "Another follow-up", subject: "", body: "" }])}>
          <Plus size={14} /> Add step
        </button>
      </div>
    </section>
  );
}

export function BusinessForm({ b }: { b: Business }) {
  const [state, action, pending] = useActionState(updateBusiness, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-[15px] font-semibold">Business</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bn">Business name</label>
          <input id="bn" name="name" className="field" defaultValue={b.name} required />
        </div>
        <div>
          <label className="label" htmlFor="bo">Your name (signs messages)</label>
          <input id="bo" name="owner_name" className="field" defaultValue={b.owner_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="bp">Phone</label>
          <input id="bp" name="phone" className="field" defaultValue={b.phone ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="bc">City</label>
          <input id="bc" name="city" className="field" defaultValue={b.city ?? ""} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {state?.ok && <span className="text-[13px] text-muted">Saved</span>}
        <button className="btn btn-dark btn-sm" disabled={pending}>
          Save
        </button>
      </div>
    </form>
  );
}
