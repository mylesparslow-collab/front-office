import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { dueMessages, type Workspace } from "./chase";
import type { Activity, Business, Cadences, Contact, Invoice, Lead, Message, Quote } from "./types";

export interface FullWorkspace extends Workspace {
  business: Business;
  activities: Activity[];
  userEmail: string;
  now: Date;
  baseUrl: string;
}

export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const num = <T,>(rows: T[], keys: (keyof T)[]): T[] =>
  rows.map((r) => {
    const c = { ...r } as Record<keyof T, unknown>;
    for (const k of keys) c[k] = Number(c[k]);
    return c as T;
  });

/** Loads everything for the signed-in user's workspace, after queuing any chasers that came due. */
export const loadWorkspace = cache(async (): Promise<FullWorkspace> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("business_id, businesses(*)")
    .eq("user_id", auth.user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect(auth.user.is_anonymous ? "/demo" : "/onboarding");
  const business = membership.businesses as unknown as Business;
  const b = business.id;

  const fetchAll = async () => {
    const [contacts, leads, quotes, invoices, messages, activities, cadences] = await Promise.all([
      supabase.from("contacts").select("*").eq("business_id", b).order("name"),
      supabase.from("leads").select("*").eq("business_id", b).order("created_at", { ascending: false }),
      supabase.from("quotes").select("*").eq("business_id", b).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("business_id", b).order("issued_on", { ascending: false }),
      supabase.from("messages").select("*").eq("business_id", b).order("due_at", { ascending: false }),
      supabase.from("activities").select("*").eq("business_id", b).order("created_at", { ascending: false }),
      supabase.from("cadences").select("*").eq("business_id", b),
    ]);
    const cad = { quote: [], invoice: [], lead: [] } as Cadences;
    for (const row of cadences.data ?? []) cad[row.kind as keyof Cadences] = row.steps;
    return {
      contacts: (contacts.data ?? []) as Contact[],
      leads: num((leads.data ?? []) as Lead[], ["value"]),
      quotes: num((quotes.data ?? []) as Quote[], ["amount"]),
      invoices: num((invoices.data ?? []) as Invoice[], ["amount", "paid"]),
      messages: (messages.data ?? []) as Message[],
      activities: (activities.data ?? []) as Activity[],
      cadences: cad,
    };
  };

  const now = new Date();
  const url = await baseUrl();
  let data = await fetchAll();
  const due = dueMessages({ business, ...data }, now, url);
  if (due.length) {
    await supabase.from("messages").insert(due.map((m) => ({ ...m, business_id: b, status: "queued" })));
    data = await fetchAll();
  }
  return { business, ...data, userEmail: auth.user.is_anonymous ? "Demo visitor" : auth.user.email ?? "", now, baseUrl: url };
});
