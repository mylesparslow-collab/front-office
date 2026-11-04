// Tenant isolation check against the live database, using only the public key.
// Creates two throwaway demo workspaces and proves neither can read, change,
// insert into, delete from or reset the other.  Run: node scripts/isolation-test.mjs
const U = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bkycetowyqnlrnrdznzr.supabase.co";
const K = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__NB48FxJULwoQAAiz27XBA_MFbrMngA";
const H = (t) => ({ apikey: K, "content-type": "application/json", ...(t ? { authorization: "Bearer " + t } : {}) });
const anon = async () => (await (await fetch(U + "/auth/v1/signup", { method: "POST", headers: H(), body: "{}" })).json()).access_token;
const rpc = async (t, f, b = {}) => { const r = await fetch(U + "/rest/v1/rpc/" + f, { method: "POST", headers: H(t), body: JSON.stringify(b) }); return [r.status, await r.json().catch(() => null)]; };
const get = async (t, p) => { const r = await fetch(U + "/rest/v1/" + p, { headers: H(t) }); return [r.status, await r.json().catch(() => null)]; };

let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); if (!ok) failed++; };

const A = await anon(), B = await anon();
const [, bA] = await rpc(A, "start_demo");
const [, bB] = await rpc(B, "start_demo");
check("two visitors get different workspaces", bA && bB && bA !== bB);
for (const t of ["contacts", "leads", "quotes", "invoices", "messages", "activities", "cadences"]) {
  const [, rows] = await get(A, `${t}?select=business_id`);
  const [, other] = await get(A, `${t}?select=business_id&business_id=eq.${bB}`);
  check(`${t}: A sees only its own rows`, rows.length > 0 && rows.every((r) => r.business_id === bA), `${rows.length} rows`);
  check(`${t}: A sees none of B's rows`, other.length === 0);
}
const [, biz] = await get(A, "businesses?select=id");
check("businesses: A sees exactly one", biz.length === 1 && biz[0].id === bA);
let r = await fetch(`${U}/rest/v1/invoices?business_id=eq.${bB}`, { method: "PATCH", headers: { ...H(A), Prefer: "return=representation" }, body: JSON.stringify({ paid: 0 }) });
check("A cannot update B's invoices", (await r.json()).length === 0);
r = await fetch(`${U}/rest/v1/invoices`, { method: "POST", headers: H(A), body: JSON.stringify({ business_id: bB, number: "X", title: "x", amount: 1, due_on: "2030-01-01" }) });
check("A cannot insert into B's workspace", r.status === 403);
r = await fetch(`${U}/rest/v1/invoices?business_id=eq.${bB}`, { method: "DELETE", headers: { ...H(A), Prefer: "return=representation" } });
check("A cannot delete B's invoices", (await r.json()).length === 0);
const [, reset] = await rpc(A, "reset_demo", { b: bB });
check("A cannot reset B's workspace", reset?.message === "not a member");
const [, bRows] = await get(B, "invoices?select=id");
check("B's data is intact", bRows.length > 0, `${bRows.length} invoices`);
const [ns] = await get(null, "invoices?select=id");
check("no login means no table access", ns === 401 || ns === 403, `HTTP ${ns}`);
const [, fake] = await rpc(null, "quote_by_token", { p_token: "deadbeef", p_track: false });
check("guessing a quote token returns nothing", fake === null);
console.log(failed ? `\n${failed} checks failed` : "\nAll isolation checks passed");
process.exit(failed ? 1 : 0);
