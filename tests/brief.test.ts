import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrief } from "../src/lib/brief.ts";
import type { Contact, Invoice, Lead, Quote } from "../src/lib/types.ts";

const NOW = new Date(2026, 10, 2, 7);
const day = (n: number) => {
  const d = new Date(2026, 10, 2 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const iso = (n: number, h = 9) => new Date(2026, 10, 2 + n, h).toISOString();
const contacts: Contact[] = [{ id: "c1", name: "Ana Ruiz", company: null, email: null, phone: null, address: null }];
const base = { business: { name: "Saltbrush", owner_name: "Renata Solis" }, contacts };
const lead = (p: Partial<Lead>): Lead => ({ id: "l", contact_id: "c1", title: "Furnace", source: "Phone", stage: "new", value: 1000, notes: null, lost_reason: null, first_response_at: null, last_touch_at: null, created_at: iso(-1), ...p });
const quote = (p: Partial<Quote>): Quote => ({ id: "q", lead_id: null, contact_id: "c1", number: "Q-1", title: "t", items: [], amount: 2000, status: "sent", public_token: "t", sent_at: iso(-6), viewed_at: null, decided_at: null, accepted_by: null, valid_until: null, chase_paused: false, created_at: iso(-6), ...p });
const inv = (p: Partial<Invoice>): Invoice => ({ id: "i", contact_id: "c1", quote_id: null, number: "INV-1", title: "t", amount: 900, paid: 0, issued_on: day(-40), due_on: day(-10), paid_on: null, chase_paused: false, created_at: "", ...p });

test("brief counts the week and names the one thing to do first", () => {
  const b = buildBrief({ ...base, leads: [lead({}), lead({ id: "l2", created_at: iso(-20) })], quotes: [quote({})], invoices: [inv({})] }, NOW);
  assert.equal(b.lines[0].value, "1");
  assert.match(b.lines[0].detail, /2 still waiting/);
  assert.match(b.lines[1].detail, /sent 5\+ days ago/);
  assert.equal(b.lines[2].value, "$900");
  assert.match(b.oneThing, /Reply to Ana Ruiz/);
  assert.match(b.text, /^Good morning, Renata\./);
});

test("brief falls through to the next priority when leads are answered", () => {
  const answered = lead({ stage: "contacted", first_response_at: iso(-1, 10) });
  const b = buildBrief({ ...base, leads: [answered], quotes: [], invoices: [inv({})] }, NOW);
  assert.match(b.oneThing, /Call Ana Ruiz about INV-1/);
  const calm = buildBrief({ ...base, leads: [], quotes: [], invoices: [] }, NOW);
  assert.match(calm.oneThing, /Nothing is stuck/);
  assert.equal(calm.lines[2].detail, "Nothing past due.");
});

test("collected this week only counts the last seven days", () => {
  const b = buildBrief({ ...base, leads: [], quotes: [], invoices: [inv({ paid: 900, paid_on: day(-2) }), inv({ id: "i2", paid: 500, paid_on: day(-20) })] }, NOW);
  assert.equal(b.lines[3].value, "$900");
});
