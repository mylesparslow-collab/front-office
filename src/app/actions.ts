"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CadenceStep, LineItem, Stage, SubjectType } from "@/lib/types";

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: m } = await supabase.from("memberships").select("business_id").eq("user_id", data.user.id).order("created_at").limit(1).maybeSingle();
  if (!m) redirect("/onboarding");
  return { supabase, b: m.business_id as string };
}

const today = () => new Date().toISOString().slice(0, 10);
const done = (path = "/app") => revalidatePath(path, "layout");

async function log(supabase: Awaited<ReturnType<typeof createClient>>, b: string, subject_type: SubjectType, subject_id: string, kind: string, body: string) {
  await supabase.from("activities").insert({ business_id: b, subject_type, subject_id, kind, body });
}

/* ---------- auth ---------- */

export async function signIn(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "That email and password don't match an account." };
  redirect(String(form.get("next") || "/app"));
}

export async function openDemo() {
  const supabase = await createClient();
  const { data: existing } = await supabase.auth.getUser();
  if (!existing.user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) redirect("/login?error=demo");
  }
  const { error } = await supabase.rpc("start_demo");
  if (error) redirect("/login?error=demo");
  redirect("/app");
}

export async function signUp(_: unknown, form: FormData) {
  const supabase = await createClient();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.session) return { ok: "Check your inbox to confirm your email, then sign in." };
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createWorkspace(_: unknown, form: FormData) {
  const supabase = await createClient();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give your business a name." };
  const { error } = await supabase.rpc("create_business", {
    p_name: name,
    p_industry: String(form.get("industry") ?? "") || null,
    p_city: String(form.get("city") ?? "") || null,
  });
  if (error) return { error: error.message };
  redirect("/app");
}

/* ---------- chasers ---------- */

export async function approveMessage(id: string, body?: string, subject?: string | null) {
  const { supabase, b } = await ctx();
  const patch: Record<string, unknown> = { status: "sent", sent_at: new Date().toISOString() };
  if (body !== undefined) patch.body = body;
  if (subject !== undefined) patch.subject = subject;
  const { data: m } = await supabase.from("messages").update(patch).eq("id", id).eq("business_id", b).select().single();
  if (m?.subject_type === "lead") {
    await supabase.from("leads").update({ first_response_at: new Date().toISOString(), last_touch_at: new Date().toISOString(), stage: "contacted" }).eq("id", m.subject_id).eq("stage", "new");
  }
  if (m) await log(supabase, b, m.subject_type, m.subject_id, "chaser", `${m.channel === "sms" ? "Text" : "Email"} approved: ${m.subject ?? m.body.slice(0, 60)}`);
  done();
}

export async function approveAll(ids: string[]) {
  for (const id of ids) await approveMessage(id);
}

export async function skipMessage(id: string) {
  const { supabase, b } = await ctx();
  await supabase.from("messages").update({ status: "skipped" }).eq("id", id).eq("business_id", b);
  done();
}

/** Owner answers a customer: logs it, which also un-pauses the cadence. */
export async function sendReply(kind: SubjectType, subjectId: string, contactId: string | null, body: string, channel: "email" | "sms") {
  const { supabase, b } = await ctx();
  const now = new Date().toISOString();
  await supabase.from("messages").insert({ business_id: b, contact_id: contactId, subject_type: kind, subject_id: subjectId, step: null, direction: "out", channel, status: "sent", body, due_at: now, sent_at: now });
  if (kind === "lead") await supabase.from("leads").update({ first_response_at: now, last_touch_at: now, stage: "contacted" }).eq("id", subjectId).eq("stage", "new");
  done();
}

/** Record something the customer said (a call, a text to your phone). Pauses automatic chasing. */
export async function logCustomerReply(kind: SubjectType, subjectId: string, contactId: string | null, body: string) {
  const { supabase, b } = await ctx();
  const now = new Date().toISOString();
  await supabase.from("messages").insert({ business_id: b, contact_id: contactId, subject_type: kind, subject_id: subjectId, step: null, direction: "in", channel: "sms", status: "received", body, due_at: now, sent_at: now });
  await supabase.from("messages").update({ status: "skipped" }).eq("business_id", b).eq("subject_type", kind).eq("subject_id", subjectId).eq("status", "queued");
  done();
}

export async function setPaused(kind: "quote" | "invoice", id: string, paused: boolean) {
  const { supabase, b } = await ctx();
  await supabase.from(kind === "quote" ? "quotes" : "invoices").update({ chase_paused: paused }).eq("id", id).eq("business_id", b);
  if (paused) await supabase.from("messages").update({ status: "skipped" }).eq("business_id", b).eq("subject_type", kind).eq("subject_id", id).eq("status", "queued");
  await log(supabase, b, kind, id, "note", paused ? "Chasing paused" : "Chasing resumed");
  done();
}

/* ---------- invoices ---------- */

export async function recordPayment(invoiceId: string, amount: number) {
  const { supabase, b } = await ctx();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("business_id", b).single();
  if (!inv || !(amount > 0)) return;
  const paid = Math.min(Number(inv.amount), Number(inv.paid) + amount);
  const full = paid >= Number(inv.amount);
  await supabase.from("invoices").update({ paid, paid_on: full ? today() : inv.paid_on }).eq("id", invoiceId);
  await log(supabase, b, "invoice", invoiceId, "payment", `Payment received: $${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  if (full) await supabase.from("messages").update({ status: "skipped" }).eq("business_id", b).eq("subject_type", "invoice").eq("subject_id", invoiceId).eq("status", "queued");
  done();
}

export async function createInvoice(_: unknown, form: FormData) {
  const { supabase, b } = await ctx();
  const contactId = await ensureContact(supabase, b, form);
  const amount = Number(form.get("amount"));
  if (!(amount > 0)) return { error: "Enter an amount." };
  const terms = Number(form.get("terms") ?? 15);
  const issued = new Date();
  const due = new Date(issued.getTime() + terms * 86_400_000);
  const number = await nextNumber(supabase, b, "invoices", "INV-", 1001);
  const { data, error } = await supabase
    .from("invoices")
    .insert({ business_id: b, contact_id: contactId, number, title: String(form.get("title") || "Service"), amount, issued_on: issued.toISOString().slice(0, 10), due_on: due.toISOString().slice(0, 10), quote_id: form.get("quote_id") || null })
    .select()
    .single();
  if (error) return { error: error.message };
  await log(supabase, b, "invoice", data.id, "created", `Invoice ${number} created`);
  done();
  redirect(`/app/invoices/${data.id}`);
}

/* ---------- quotes ---------- */

export async function saveQuote(input: { id?: string; contact: { id?: string; name?: string; email?: string; phone?: string }; leadId?: string | null; title: string; items: LineItem[]; validDays: number; send: boolean }) {
  const { supabase, b } = await ctx();
  let contactId = input.contact.id ?? null;
  if (!contactId && input.contact.name) {
    const { data } = await supabase.from("contacts").insert({ business_id: b, name: input.contact.name, email: input.contact.email || null, phone: input.contact.phone || null }).select("id").single();
    contactId = data?.id ?? null;
  }
  const items = input.items.filter((i) => i.description.trim() && i.qty > 0);
  const amount = items.reduce((s, i) => s + i.qty * i.unit, 0);
  const valid = new Date(Date.now() + input.validDays * 86_400_000).toISOString().slice(0, 10);
  const row = { business_id: b, contact_id: contactId, lead_id: input.leadId ?? null, title: input.title || "Quote", items, amount, valid_until: valid, ...(input.send ? { status: "sent", sent_at: new Date().toISOString() } : {}) };
  let id = input.id;
  if (id) {
    await supabase.from("quotes").update(row).eq("id", id).eq("business_id", b);
  } else {
    const number = await nextNumber(supabase, b, "quotes", "Q-", 2001);
    const { data } = await supabase.from("quotes").insert({ ...row, number }).select("id").single();
    id = data!.id;
  }
  if (input.leadId) await supabase.from("leads").update({ stage: "quoted", value: amount, last_touch_at: new Date().toISOString() }).eq("id", input.leadId);
  await log(supabase, b, "quote", id!, input.send ? "sent" : "created", input.send ? "Quote sent to customer" : "Quote saved as draft");
  done();
  return { id: id! };
}

export async function sendQuote(id: string) {
  const { supabase, b } = await ctx();
  await supabase.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id).eq("business_id", b).eq("status", "draft");
  await log(supabase, b, "quote", id, "sent", "Quote sent to customer");
  done();
}

export async function decideQuote(id: string, accept: boolean) {
  const { supabase, b } = await ctx();
  const { data: q } = await supabase.from("quotes").update({ status: accept ? "accepted" : "declined", decided_at: new Date().toISOString() }).eq("id", id).eq("business_id", b).select().single();
  if (q?.lead_id) await supabase.from("leads").update({ stage: accept ? "won" : "lost", lost_reason: accept ? null : "Declined quote" }).eq("id", q.lead_id);
  await supabase.from("messages").update({ status: "skipped" }).eq("business_id", b).eq("subject_type", "quote").eq("subject_id", id).eq("status", "queued");
  await log(supabase, b, "quote", id, accept ? "accepted" : "declined", accept ? "Marked accepted" : "Marked declined");
  done();
}

export async function invoiceFromQuote(id: string) {
  const { supabase, b } = await ctx();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).eq("business_id", b).single();
  if (!q) return;
  const number = await nextNumber(supabase, b, "invoices", "INV-", 1001);
  const issued = new Date();
  const { data } = await supabase
    .from("invoices")
    .insert({ business_id: b, contact_id: q.contact_id, quote_id: q.id, number, title: q.title, amount: q.amount, issued_on: issued.toISOString().slice(0, 10), due_on: new Date(issued.getTime() + 15 * 86_400_000).toISOString().slice(0, 10) })
    .select("id")
    .single();
  await log(supabase, b, "invoice", data!.id, "created", `Invoice ${number} created from quote ${q.number}`);
  done();
  redirect(`/app/invoices/${data!.id}`);
}

/* ---------- leads ---------- */

export async function createLead(_: unknown, form: FormData) {
  const { supabase, b } = await ctx();
  const contactId = await ensureContact(supabase, b, form);
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "What does the customer need?" };
  await supabase.from("leads").insert({ business_id: b, contact_id: contactId, title, source: String(form.get("source") || "Phone"), value: Number(form.get("value") || 0), notes: String(form.get("notes") || "") || null });
  done();
  return { ok: true };
}

export async function moveLead(id: string, stage: Stage) {
  const { supabase, b } = await ctx();
  const patch: Record<string, unknown> = { stage, last_touch_at: new Date().toISOString() };
  if (stage !== "new") {
    const { data: l } = await supabase.from("leads").select("first_response_at").eq("id", id).single();
    if (l && !l.first_response_at) patch.first_response_at = new Date().toISOString();
  }
  await supabase.from("leads").update(patch).eq("id", id).eq("business_id", b);
  if (stage !== "new") await supabase.from("messages").update({ status: "skipped" }).eq("business_id", b).eq("subject_type", "lead").eq("subject_id", id).eq("status", "queued");
  await log(supabase, b, "lead", id, "stage", `Moved to ${stage}`);
  done();
}

/* ---------- settings ---------- */

export async function saveCadence(kind: SubjectType, steps: CadenceStep[]) {
  const { supabase, b } = await ctx();
  const clean = steps
    .filter((s) => s.body.trim())
    .map((s) => ({ ...s, day: Math.round(Number(s.day)), subject: s.channel === "sms" ? null : s.subject }))
    .sort((a, b2) => a.day - b2.day);
  await supabase.from("cadences").update({ steps: clean, updated_at: new Date().toISOString() }).eq("business_id", b).eq("kind", kind);
  done();
}

export async function updateBusiness(_: unknown, form: FormData) {
  const { supabase, b } = await ctx();
  await supabase
    .from("businesses")
    .update({ name: String(form.get("name")), owner_name: String(form.get("owner_name") || "") || null, phone: String(form.get("phone") || "") || null, city: String(form.get("city") || "") || null })
    .eq("id", b);
  done();
  return { ok: "Saved" };
}

export async function resetDemo() {
  const { supabase, b } = await ctx();
  await supabase.rpc("reset_demo", { b });
  done();
  redirect("/app");
}

/* ---------- helpers ---------- */

async function ensureContact(supabase: Awaited<ReturnType<typeof createClient>>, b: string, form: FormData): Promise<string | null> {
  const existing = String(form.get("contact_id") ?? "");
  if (existing) return existing;
  const name = String(form.get("contact_name") ?? "").trim();
  if (!name) return null;
  const { data } = await supabase
    .from("contacts")
    .insert({ business_id: b, name, email: String(form.get("contact_email") || "") || null, phone: String(form.get("contact_phone") || "") || null })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function nextNumber(supabase: Awaited<ReturnType<typeof createClient>>, b: string, table: "quotes" | "invoices", prefix: string, start: number) {
  const { data } = await supabase.from(table).select("number").eq("business_id", b);
  const max = (data ?? []).reduce((m, r) => {
    const n = Number(String(r.number).replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, start - 1);
  return `${prefix}${max + 1}`;
}
