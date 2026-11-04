import { test } from "node:test";
import assert from "node:assert/strict";
import { aging, avgDaysToPay, bucketOf, collectedByMonth, medianResponseMinutes, onTimeRate, overdueTotal, winRate } from "../src/lib/metrics.ts";
import type { Invoice, Quote, Lead } from "../src/lib/types.ts";

const NOW = new Date(2026, 10, 4, 12);
const day = (n: number) => {
  const d = new Date(2026, 10, 4 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const inv = (p: Partial<Invoice>): Invoice => ({ id: "x", contact_id: null, quote_id: null, number: "1", title: "t", amount: 100, paid: 0, issued_on: day(-30), due_on: day(-15), paid_on: null, chase_paused: false, created_at: "", ...p });

test("aging buckets use days past due and only open balances", () => {
  assert.equal(bucketOf(inv({ due_on: day(3) }), NOW), "Not due");
  assert.equal(bucketOf(inv({ due_on: day(0) }), NOW), "Not due");
  assert.equal(bucketOf(inv({ due_on: day(-1) }), NOW), "1-30");
  assert.equal(bucketOf(inv({ due_on: day(-31) }), NOW), "31-60");
  assert.equal(bucketOf(inv({ due_on: day(-90) }), NOW), "61-90");
  assert.equal(bucketOf(inv({ due_on: day(-91) }), NOW), "90+");
  const a = aging([inv({ amount: 500, paid: 200 }), inv({ amount: 100, paid: 100 }), inv({ amount: 50, due_on: day(5) })], NOW);
  assert.equal(a["1-30"].total, 300);
  assert.equal(a["1-30"].count, 1);
  assert.equal(a["Not due"].total, 50);
  assert.equal(overdueTotal([inv({ amount: 500, paid: 200 }), inv({ amount: 50, due_on: day(5) })], NOW), 300);
});

test("days to pay and on-time rate", () => {
  const paid = [inv({ paid: 100, issued_on: day(-30), due_on: day(-15), paid_on: day(-20) }), inv({ paid: 100, issued_on: day(-30), due_on: day(-15), paid_on: day(-10) })];
  assert.equal(avgDaysToPay(paid, NOW), 15);
  assert.equal(onTimeRate(paid, NOW), 0.5);
  assert.equal(avgDaysToPay([], NOW), null);
});

test("collections land in the month they were paid", () => {
  const rows = collectedByMonth([inv({ paid: 100, paid_on: "2026-11-02" }), inv({ paid: 40, paid_on: "2026-10-31" }), inv({ paid: 999, paid_on: "2025-01-01" })], NOW, 3);
  assert.deepEqual(rows.map((r) => r.total), [0, 40, 100]);
  assert.deepEqual(rows.map((r) => r.label), ["Sep", "Oct", "Nov"]);
});

test("win rate counts decided quotes only", () => {
  const q = (status: Quote["status"]) => ({ status, decided_at: new Date(2026, 10, 1).toISOString() }) as Quote;
  assert.equal(winRate([q("accepted"), q("declined"), q("accepted"), { status: "sent" } as Quote], NOW), 2 / 3);
});

test("median response time ignores leads nobody answered", () => {
  const l = (created: number, resp: number | null) => ({ created_at: new Date(created * 60_000).toISOString(), first_response_at: resp === null ? null : new Date(resp * 60_000).toISOString() }) as Lead;
  assert.equal(medianResponseMinutes([l(0, 10), l(0, 30), l(0, null), l(0, 20)]), 20);
});
