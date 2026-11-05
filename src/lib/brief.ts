// The Monday brief: one short message that replaces opening five screens.
// Pure function over the workspace so it is unit-tested and the preview on the
// Automations page is exactly what would be sent.
import { aging, avgDaysToPay, balance, daysLate, medianResponseMinutes, openQuotes, waitingLeads, formatMinutes } from "./metrics.ts";
import { compactMoney, daysBetween, firstName, money, parseDay } from "./format.ts";
import type { Contact, Invoice, Lead, Quote } from "./types.ts";

export interface BriefInput {
  business: { name: string; owner_name: string | null };
  leads: Lead[];
  quotes: Quote[];
  invoices: Invoice[];
  contacts: Contact[];
}

export interface BriefLine {
  label: string;
  value: string;
  detail: string;
  tone?: "red" | "sun";
}

export interface Brief {
  greeting: string;
  headline: string;
  lines: BriefLine[];
  oneThing: string;
  text: string;
}

export function buildBrief(ws: BriefInput, now: Date): Brief {
  const who = (id: string | null) => ws.contacts.find((c) => c.id === id)?.name ?? "a customer";

  const newLeads = ws.leads.filter((l) => daysBetween(new Date(l.created_at), now) <= 7);
  const waiting = waitingLeads(ws.leads);
  const med = medianResponseMinutes(ws.leads.filter((l) => daysBetween(new Date(l.created_at), now) <= 30));

  const open = openQuotes(ws.quotes);
  const openValue = open.reduce((s, q) => s + q.amount, 0);
  const stale = open.filter((q) => q.sent_at && daysBetween(new Date(q.sent_at), now) >= 5).sort((a, b) => b.amount - a.amount);

  const late = ws.invoices.filter((i) => balance(i) > 0 && daysLate(i, now) > 0).sort((a, b) => balance(b) - balance(a));
  const lateTotal = late.reduce((s, i) => s + balance(i), 0);
  const weekCollected = ws.invoices
    .filter((i) => i.paid_on && daysBetween(parseDay(i.paid_on), now) <= 7 && daysBetween(parseDay(i.paid_on), now) >= 0)
    .reduce((s, i) => s + i.paid, 0);
  const dtp = avgDaysToPay(ws.invoices, now);
  const ag = aging(ws.invoices, now);
  const dueSoon = ag["Not due"];

  const lines: BriefLine[] = [
    {
      label: "New leads",
      value: String(newLeads.length),
      detail: waiting.length
        ? `${waiting.length} still waiting for a first reply${med ? `. Typical reply time: ${formatMinutes(med)}.` : "."}`
        : med
          ? `Every one answered. Typical reply time: ${formatMinutes(med)}.`
          : "Every one answered.",
      tone: waiting.length ? "red" : undefined,
    },
    {
      label: "Quotes out",
      value: compactMoney(openValue),
      detail: stale.length ? `${open.length} open. ${stale.length} sent 5+ days ago with no answer, led by ${who(stale[0].contact_id)} at ${money(stale[0].amount)}.` : `${open.length} open and none are going quiet.`,
      tone: stale.length ? "sun" : undefined,
    },
    {
      label: "Overdue",
      value: compactMoney(lateTotal),
      detail: late.length ? `${late.length} invoice${late.length === 1 ? "" : "s"}. Oldest: ${who(late[late.length - 1].contact_id)}, ${Math.max(...late.map((i) => daysLate(i, now)))} days late.` : "Nothing past due.",
      tone: late.length ? "red" : undefined,
    },
    {
      label: "Collected this week",
      value: compactMoney(weekCollected),
      detail: `${dueSoon.count} invoice${dueSoon.count === 1 ? "" : "s"} worth ${money(dueSoon.total)} not yet due${dtp ? `. Customers pay in ${Math.round(dtp)} days on average.` : "."}`,
    },
  ];

  let oneThing: string;
  if (waiting.length) oneThing = `Reply to ${who(waiting[0].contact_id)} (${waiting[0].title}). Lead replies lose value by the hour.`;
  else if (late.length) oneThing = `Call ${who(late[0].contact_id)} about ${late[0].number}: ${money(balance(late[0]))}, ${daysLate(late[0], now)} days late.`;
  else if (stale.length) oneThing = `Check in with ${who(stale[0].contact_id)} on ${stale[0].number} (${money(stale[0].amount)}).`;
  else oneThing = "Nothing is stuck. Pick one open quote and ask if they have questions.";

  const name = firstName(ws.business.owner_name);
  const greeting = `Good morning, ${name}.`;
  const headline = `${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"}, ${compactMoney(openValue)} in quotes out, ${compactMoney(lateTotal)} overdue.`;
  const text = [greeting, headline, "", ...lines.map((l) => `${l.label}: ${l.value}. ${l.detail}`), "", `One thing for today: ${oneThing}`].join("\n");
  return { greeting, headline, lines, oneThing, text };
}
