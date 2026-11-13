"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { decidePublicQuote } from "./actions";

export function Decide({ token, customer }: { token: string; customer: string }) {
  const [name, setName] = useState(customer);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  if (result === "accepted")
    return (
      <div className="rounded-2xl bg-ink p-6 text-white">
        <div className="flex size-10 items-center justify-center rounded-full bg-sun text-ink">
          <Check size={20} strokeWidth={3} />
        </div>
        <p className="mt-4 text-[18px] font-semibold">You&apos;re booked in. Thank you!</p>
        <p className="mt-1 text-[14px] text-white/70">We&apos;ll reach out shortly to schedule the work.</p>
      </div>
    );
  if (result === "declined") return <p className="rounded-2xl bg-canvas p-6 text-[14px] ring-1 ring-line">Thanks for letting us know. If anything changes, just reply to our last message.</p>;
  return (
    <div className="space-y-3">
      <label className="label" htmlFor="sig">Type your full name to approve</label>
      <input id="sig" className="field h-12 text-[16px]" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <button className="btn btn-primary h-12 w-full text-[15px]" disabled={pending || !name.trim()} onClick={() => start(async () => setResult(await decidePublicQuote(token, true, name)))}>
        Approve quote
      </button>
      {declining ? (
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" disabled={pending} onClick={() => start(async () => setResult(await decidePublicQuote(token, false, "")))}>
            Yes, decline
          </button>
          <button className="btn btn-quiet flex-1" onClick={() => setDeclining(false)}>
            Keep it open
          </button>
        </div>
      ) : (
        <button className="btn btn-quiet w-full" onClick={() => setDeclining(true)}>
          No thanks
        </button>
      )}
      {result && result !== "accepted" && result !== "declined" && <p className="text-[13px] text-red">This quote can no longer be changed online. Please call us.</p>}
    </div>
  );
}
