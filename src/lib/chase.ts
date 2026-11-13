// The chase engine. Pure functions only, so the rules are unit-tested and the
// same logic drives both the scheduler and the "what happens next" timelines in the UI.
import type { CadenceStep, Cadences, Contact, Invoice, Lead, Message, Quote, SubjectType } from "./types.ts";
import { addDays, daysBetween, money, parseDay, shortDate, firstName } from "./format.ts";

/** Minimum days between two automatic messages to the same customer about the same thing. */
export const MIN_GAP_DAYS = 2;

export type StepStatus = "sent" | "skipped" | "queued" | "next" | "upcoming" | "cancelled";
export type ChaseStatus = "running" | "waiting" | "replied" | "paused" | "finished" | "stopped";

export interface StepState {
  index: number;
  step: CadenceStep;
  status: StepStatus;
  /** When the step fires (or fired). */
  at: Date;
}

export interface ChaseState {
  kind: SubjectType;
  subjectId: string;
  status: ChaseStatus;
  steps: StepState[];
  /** Index of the step that should be queued right now, if any. */
  dueIndex: number | null;
  lastInbound: Message | null;
  reason: string;
}

type Subject =
  | { kind: "quote"; item: Quote }
  | { kind: "invoice"; item: Invoice }
  | { kind: "lead"; item: Lead };

function anchor(s: Subject): Date | null {
  if (s.kind === "quote") return s.item.sent_at ? new Date(s.item.sent_at) : null;
  if (s.kind === "invoice") return parseDay(s.item.due_on);
  return new Date(s.item.created_at);
}

function isOpen(s: Subject): { open: boolean; reason: string } {
  if (s.kind === "quote") {
    const q = s.item;
    if (q.status === "accepted") return { open: false, reason: "Accepted. Chasing stopped." };
    if (q.status === "declined") return { open: false, reason: "Declined. Chasing stopped." };
    if (q.status === "expired") return { open: false, reason: "Expired." };
    if (q.status === "draft") return { open: false, reason: "Starts when the quote is sent." };
    return { open: true, reason: "" };
  }
  if (s.kind === "invoice") {
    const i = s.item;
    if (i.paid >= i.amount) return { open: false, reason: "Paid in full. Chasing stopped." };
    return { open: true, reason: "" };
  }
  const l = s.item;
  if (l.stage !== "new") return { open: false, reason: "You responded. Follow-ups stopped." };
  if (l.first_response_at) return { open: false, reason: "You responded. Follow-ups stopped." };
  return { open: true, reason: "" };
}

function paused(s: Subject): boolean {
  return s.kind !== "lead" && s.item.chase_paused;
}

/** Work out where one quote, invoice or lead is in its cadence. */
export function chaseState(s: Subject, steps: CadenceStep[], messages: Message[], now: Date): ChaseState {
  const mine = messages
    .filter((m) => m.subject_type === s.kind && m.subject_id === s.item.id)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  const byStep = new Map<number, Message>();
  for (const m of mine) if (m.direction === "out" && m.step !== null) byStep.set(m.step, m);

  const lastOut = [...mine].reverse().find((m) => m.direction === "out" && m.status === "sent") ?? null;
  const lastIn = [...mine].reverse().find((m) => m.direction === "in") ?? null;
  const replied = !!lastIn && (!lastOut || +new Date(lastIn.due_at) > +new Date(lastOut.sent_at ?? lastOut.due_at));

  const a = anchor(s);
  const { open, reason } = isOpen(s);
  const isPaused = paused(s);

  const states: StepState[] = [];
  let dueIndex: number | null = null;
  let blocked = false; // a queued or future step blocks everything after it
  let prevSentAt = null as Date | null;

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const msg = byStep.get(index);
    if (msg) {
      const status: StepStatus = msg.status === "sent" ? "sent" : msg.status === "skipped" ? "skipped" : "queued";
      const at = new Date(msg.sent_at ?? msg.due_at);
      if (status === "queued") blocked = true;
      if (status === "sent") prevSentAt = at;
      states.push({ index, step, status, at });
      continue;
    }
    let at = !a ? addDays(now, step.day) : s.kind === "lead" ? new Date(a.getTime() + step.day * 86_400_000) : addDays(startOf(a), step.day);
    if (prevSentAt && daysBetween(prevSentAt, at) < MIN_GAP_DAYS) at = addDays(startOf(prevSentAt), MIN_GAP_DAYS);
    if (!open) {
      states.push({ index, step, status: "cancelled", at });
      continue;
    }
    if (!blocked && dueIndex === null && !replied && !isPaused && at.getTime() <= now.getTime()) {
      dueIndex = index;
      states.push({ index, step, status: "next", at });
      blocked = true;
      continue;
    }
    states.push({ index, step, status: blocked || dueIndex !== null ? "upcoming" : "next", at });
    blocked = true;
  }

  let status: ChaseStatus;
  let why = reason;
  if (!open) status = s.kind === "invoice" || (s.kind === "quote" && s.item.status === "accepted") ? "finished" : "stopped";
  else if (replied) {
    status = "replied";
    why = "Customer replied. Chasing waits for you.";
  } else if (isPaused) {
    status = "paused";
    why = "Paused by you.";
  } else if (states.every((x) => x.status === "sent" || x.status === "skipped")) {
    status = "finished";
    why = s.kind === "invoice" ? "Every reminder went out. Time for a phone call." : "Cadence complete.";
  } else if (dueIndex !== null || states.some((x) => x.status === "queued")) {
    status = "running";
    why = "A message is waiting for your OK.";
  } else {
    status = "waiting";
    const nxt = states.find((x) => x.status === "next" || x.status === "upcoming");
    why = nxt ? `Next: ${nxt.step.label.toLowerCase()} on ${shortDate(nxt.at)}.` : "";
  }

  return { kind: s.kind, subjectId: s.item.id, status, steps: states, dueIndex, lastInbound: replied ? lastIn : null, reason: why };
}

function startOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
}

export interface RenderContext {
  business: { name: string; owner_name: string | null };
  contact: Contact | undefined;
  now: Date;
  baseUrl?: string;
}

export function render(template: string, s: Subject, ctx: RenderContext): string {
  const vars: Record<string, string> = {
    first: firstName(ctx.contact?.name),
    owner: firstName(ctx.business.owner_name ?? ctx.business.name),
    business: ctx.business.name,
    title: s.item.title.toLowerCase().startsWith("the ") ? s.item.title : s.item.title.charAt(0).toLowerCase() + s.item.title.slice(1),
  };
  if (s.kind === "quote") {
    vars.number = s.item.number;
    vars.amount = money(s.item.amount);
    vars.valid_until = s.item.valid_until ? shortDate(s.item.valid_until) : "the end of the month";
  }
  if (s.kind === "invoice") {
    vars.number = s.item.number;
    vars.amount = money(s.item.amount, { cents: true });
    vars.balance = money(s.item.amount - s.item.paid, { cents: true });
    vars.due = shortDate(s.item.due_on);
    vars.days_late = String(Math.max(0, daysBetween(parseDay(s.item.due_on), ctx.now)));
  }
  let out = template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
  if (s.kind === "quote" && ctx.baseUrl && template.length > 80) {
    out += `\n\nView or approve your quote: ${ctx.baseUrl}/q/${s.item.public_token}`;
  }
  return out;
}

export interface NewMessage {
  contact_id: string | null;
  subject_type: SubjectType;
  subject_id: string;
  step: number;
  channel: "email" | "sms";
  subject: string | null;
  body: string;
  due_at: string;
}

export interface Workspace {
  business: { name: string; owner_name: string | null };
  cadences: Cadences;
  quotes: Quote[];
  invoices: Invoice[];
  leads: Lead[];
  contacts: Contact[];
  messages: Message[];
}

export function subjects(ws: Workspace): Subject[] {
  return [
    ...ws.quotes.map((item) => ({ kind: "quote" as const, item })),
    ...ws.invoices.map((item) => ({ kind: "invoice" as const, item })),
    ...ws.leads.map((item) => ({ kind: "lead" as const, item })),
  ];
}

/** Every message the cadences say should be queued right now. */
export function dueMessages(ws: Workspace, now: Date, baseUrl?: string): NewMessage[] {
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const out: NewMessage[] = [];
  for (const s of subjects(ws)) {
    const steps = ws.cadences[s.kind] ?? [];
    const st = chaseState(s, steps, ws.messages, now);
    if (st.dueIndex === null) continue;
    const step = steps[st.dueIndex];
    const contact = s.item.contact_id ? contacts.get(s.item.contact_id) : undefined;
    const ctx = { business: ws.business, contact, now, baseUrl };
    out.push({
      contact_id: s.item.contact_id,
      subject_type: s.kind,
      subject_id: s.item.id,
      step: st.dueIndex,
      channel: step.channel,
      subject: step.subject ? render(step.subject, s, ctx) : null,
      body: render(step.body, s, ctx),
      due_at: st.steps[st.dueIndex].at.toISOString(),
    });
  }
  return out;
}

export function stateFor(ws: Workspace, kind: SubjectType, id: string, now: Date): ChaseState | null {
  const s = subjects(ws).find((x) => x.kind === kind && x.item.id === id);
  if (!s) return null;
  return chaseState(s, ws.cadences[kind] ?? [], ws.messages, now);
}
