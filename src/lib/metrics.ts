// Business numbers computed from raw rows. Pure, so they're unit-tested.
import type { Invoice, Lead, Quote } from "./types.ts";
import { daysBetween, parseDay } from "./format.ts";

export const BUCKETS = ["Not due", "1-30", "31-60", "61-90", "90+"] as const;
export type Bucket = (typeof BUCKETS)[number];

export function balance(i: Invoice): number {
  return Math.max(0, i.amount - i.paid);
}

export function daysLate(i: Invoice, now: Date): number {
  return daysBetween(parseDay(i.due_on), now);
}

export function bucketOf(i: Invoice, now: Date): Bucket {
  const d = daysLate(i, now);
  if (d <= 0) return "Not due";
  if (d <= 30) return "1-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  return "90+";
}

export function aging(invoices: Invoice[], now: Date): Record<Bucket, { total: number; count: number }> {
  const out = Object.fromEntries(BUCKETS.map((b) => [b, { total: 0, count: 0 }])) as Record<Bucket, { total: number; count: number }>;
  for (const i of invoices) {
    const bal = balance(i);
    if (bal <= 0) continue;
    const b = bucketOf(i, now);
    out[b].total += bal;
    out[b].count += 1;
  }
  return out;
}

export function overdueTotal(invoices: Invoice[], now: Date): number {
  return invoices.filter((i) => balance(i) > 0 && daysLate(i, now) > 0).reduce((s, i) => s + balance(i), 0);
}

/** Average days from issue to payment for invoices paid in the window. */
export function avgDaysToPay(invoices: Invoice[], now: Date, windowDays = 90): number | null {
  const paid = invoices.filter((i) => i.paid_on && i.paid >= i.amount && daysBetween(parseDay(i.paid_on), now) <= windowDays);
  if (!paid.length) return null;
  return paid.reduce((s, i) => s + daysBetween(parseDay(i.issued_on), parseDay(i.paid_on!)), 0) / paid.length;
}

/** Share of invoices paid on or before the due date, in the window. */
export function onTimeRate(invoices: Invoice[], now: Date, windowDays = 90): number | null {
  const paid = invoices.filter((i) => i.paid_on && i.paid >= i.amount && daysBetween(parseDay(i.paid_on), now) <= windowDays);
  if (!paid.length) return null;
  return paid.filter((i) => parseDay(i.paid_on!) <= parseDay(i.due_on)).length / paid.length;
}

/** Cash collected per calendar month, oldest first. Partial payments count on their invoice's paid_on or are skipped if unknown. */
export function collectedByMonth(invoices: Invoice[], now: Date, months = 6): { label: string; key: string; total: number }[] {
  const rows: { label: string; key: string; total: number }[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    rows.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      total: 0,
    });
  }
  const idx = new Map(rows.map((r, i) => [r.key, i]));
  for (const i of invoices) {
    if (!i.paid_on || i.paid <= 0) continue;
    const d = parseDay(i.paid_on);
    const j = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (j !== undefined) rows[j].total += i.paid;
  }
  return rows;
}

export function collectedThisMonth(invoices: Invoice[], now: Date): number {
  return collectedByMonth(invoices, now, 1)[0].total;
}

export function openQuotes(quotes: Quote[]): Quote[] {
  return quotes.filter((q) => q.status === "sent" || q.status === "viewed");
}

/** Accepted / (accepted + declined + expired) for quotes decided in the window. */
export function winRate(quotes: Quote[], now: Date, windowDays = 120): number | null {
  const decided = quotes.filter(
    (q) => ["accepted", "declined", "expired"].includes(q.status) && q.decided_at && daysBetween(new Date(q.decided_at), now) <= windowDays,
  );
  if (!decided.length) return null;
  return decided.filter((q) => q.status === "accepted").length / decided.length;
}

export function avgDaysToYes(quotes: Quote[]): number | null {
  const acc = quotes.filter((q) => q.status === "accepted" && q.sent_at && q.decided_at);
  if (!acc.length) return null;
  return acc.reduce((s, q) => s + daysBetween(new Date(q.sent_at!), new Date(q.decided_at!)), 0) / acc.length;
}

/** Median minutes from a lead arriving to the first response. */
export function medianResponseMinutes(leads: Lead[]): number | null {
  const mins = leads
    .filter((l) => l.first_response_at)
    .map((l) => (new Date(l.first_response_at!).getTime() - new Date(l.created_at).getTime()) / 60_000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b);
  if (!mins.length) return null;
  const mid = Math.floor(mins.length / 2);
  return mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2;
}

export function waitingLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.stage === "new" && !l.first_response_at);
}

export function pipelineValue(leads: Lead[]): number {
  return leads.filter((l) => l.stage !== "won" && l.stage !== "lost").reduce((s, l) => s + Number(l.value), 0);
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 24) return `${(m / 60).toFixed(1).replace(/\.0$/, "")} h`;
  return `${(m / 1440).toFixed(1).replace(/\.0$/, "")} days`;
}
