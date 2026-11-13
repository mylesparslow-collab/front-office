import { test } from "node:test";
import assert from "node:assert/strict";
import { chaseState, dueMessages, type Workspace } from "../src/lib/chase.ts";
import type { CadenceStep, Invoice, Message, Quote, Lead } from "../src/lib/types.ts";

const NOW = new Date(2026, 10, 4, 12, 0, 0);
const day = (n: number) => {
  const d = new Date(2026, 10, 4 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const at = (n: number) => new Date(2026, 10, 4 + n, 10).toISOString();

const invSteps: CadenceStep[] = [
  { day: -3, channel: "email", label: "Heads-up", subject: "Invoice {{number}} due {{due}}", body: "Hi {{first}}, {{balance}} due {{due}}." },
  { day: 1, channel: "email", label: "Gentle", subject: null, body: "Hi {{first}}, {{number}} was due." },
  { day: 7, channel: "sms", label: "Text", subject: null, body: "{{days_late}} days late" },
];
const quoteSteps: CadenceStep[] = [
  { day: 2, channel: "email", label: "Check-in", subject: "Quote {{number}}", body: "Hi {{first}}, any questions on {{title}}? Let me know, happy to walk through every line." },
  { day: 5, channel: "sms", label: "Nudge", subject: null, body: "Nudge" },
];
const leadSteps: CadenceStep[] = [{ day: 0, channel: "sms", label: "Instant", subject: null, body: "Hi {{first}}" }];

function inv(p: Partial<Invoice>): Invoice {
  return { id: "i1", contact_id: "c1", quote_id: null, number: "INV-1", title: "AC repair", amount: 1000, paid: 0, issued_on: day(-20), due_on: day(-5), paid_on: null, chase_paused: false, created_at: at(-20), ...p };
}
function quote(p: Partial<Quote>): Quote {
  return { id: "q1", lead_id: null, contact_id: "c1", number: "Q-1", title: "New furnace", items: [], amount: 5000, status: "sent", public_token: "tok", sent_at: at(-3), viewed_at: null, decided_at: null, accepted_by: null, valid_until: day(27), chase_paused: false, created_at: at(-3), ...p };
}
function msg(p: Partial<Message>): Message {
  return { id: Math.random().toString(), contact_id: "c1", subject_type: "invoice", subject_id: "i1", step: 0, direction: "out", channel: "email", status: "sent", subject: null, body: "", due_at: at(-8), sent_at: at(-8), created_at: at(-8), ...p };
}
const ws = (p: Partial<Workspace>): Workspace => ({
  business: { name: "Saltbrush", owner_name: "Renata Solis" },
  cadences: { invoice: invSteps, quote: quoteSteps, lead: leadSteps },
  quotes: [], invoices: [], leads: [], contacts: [{ id: "c1", name: "Luis Marquez", company: null, email: null, phone: null, address: null }], messages: [],
  ...p,
});

test("overdue invoice with nothing sent queues only the first step, not all missed ones", () => {
  const out = dueMessages(ws({ invoices: [inv({})] }), NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].step, 0);
  assert.match(out[0].body, /Hi Luis, \$1,000\.00 due/);
});

test("next step waits for the minimum gap after the previous send", () => {
  const w = ws({ invoices: [inv({})], messages: [msg({ step: 0, sent_at: new Date(NOW.getTime() - 86_400_000).toISOString(), due_at: new Date(NOW.getTime() - 86_400_000).toISOString() })] });
  assert.equal(dueMessages(w, NOW).length, 0);
  const later = new Date(NOW.getTime() + 2 * 86_400_000);
  const out = dueMessages(w, later);
  assert.equal(out.length, 1);
  assert.equal(out[0].step, 1);
});

test("a queued message blocks further queuing", () => {
  const w = ws({ invoices: [inv({})], messages: [msg({ step: 0, status: "queued", sent_at: null })] });
  assert.equal(dueMessages(w, NOW).length, 0);
});

test("paying the invoice stops the chase", () => {
  const st = chaseState({ kind: "invoice", item: inv({ paid: 1000, paid_on: day(-1) }) }, invSteps, [], NOW);
  assert.equal(st.status, "finished");
  assert.equal(st.dueIndex, null);
});

test("a customer reply pauses the chase until the owner answers", () => {
  const msgs = [msg({ step: 0, sent_at: at(-8), due_at: at(-8) }), msg({ direction: "in", status: "received", step: null, due_at: at(-1), sent_at: at(-1) })];
  const st = chaseState({ kind: "invoice", item: inv({}) }, invSteps, msgs, NOW);
  assert.equal(st.status, "replied");
  assert.equal(st.dueIndex, null);
  const answered = [...msgs, msg({ step: null, due_at: at(0), sent_at: new Date(NOW.getTime() - 3600_000).toISOString() })];
  const st2 = chaseState({ kind: "invoice", item: inv({}) }, invSteps, answered, NOW);
  assert.notEqual(st2.status, "replied");
});

test("pausing stops new messages", () => {
  assert.equal(dueMessages(ws({ invoices: [inv({ chase_paused: true })] }), NOW).length, 0);
});

test("quote chasing: accepted quotes never chase, open quotes include the approval link", () => {
  assert.equal(dueMessages(ws({ quotes: [quote({ status: "accepted", decided_at: at(-1) })] }), NOW).length, 0);
  assert.equal(dueMessages(ws({ quotes: [quote({ status: "draft", sent_at: null })] }), NOW).length, 0);
  const out = dueMessages(ws({ quotes: [quote({})] }), NOW, "https://fo.example");
  assert.equal(out.length, 1);
  assert.match(out[0].body, /https:\/\/fo\.example\/q\/tok/);
  assert.match(out[0].body, /new furnace/);
});

test("quote sent yesterday is not chased yet", () => {
  assert.equal(dueMessages(ws({ quotes: [quote({ sent_at: at(-1) })] }), NOW).length, 0);
});

test("new lead gets an instant reply queued; responded lead does not", () => {
  const lead: Lead = { id: "l1", contact_id: "c1", title: "AC broken", source: "Website", stage: "new", value: 500, notes: null, lost_reason: null, first_response_at: null, last_touch_at: null, created_at: new Date(NOW.getTime() - 5 * 60_000).toISOString() };
  assert.equal(dueMessages(ws({ leads: [lead] }), NOW).length, 1);
  assert.equal(dueMessages(ws({ leads: [{ ...lead, stage: "contacted" }] }), NOW).length, 0);
});

test("invoice not yet in the heads-up window waits", () => {
  const st = chaseState({ kind: "invoice", item: inv({ due_on: day(10) }) }, invSteps, [], NOW);
  assert.equal(st.status, "waiting");
  assert.equal(st.dueIndex, null);
});
