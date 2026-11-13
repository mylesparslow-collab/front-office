import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { money, shortDate } from "@/lib/format";
import type { LineItem } from "@/lib/types";
import { Decide } from "./decide";

export const metadata = { title: "Your quote", robots: { index: false } };

type PublicQuote = {
  number: string;
  title: string;
  items: LineItem[];
  amount: number;
  status: string;
  valid_until: string | null;
  sent_at: string | null;
  accepted_by: string | null;
  decided_at: string | null;
  business: { name: string; city: string | null; owner: string | null; phone: string | null };
  contact: { name: string | null; address: string | null };
};

export default async function PublicQuote({ params, searchParams }: PageProps<"/q/[token]">) {
  const { token } = await params;
  const preview = (await searchParams).preview === "1";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data } = await supabase.rpc("quote_by_token", { p_token: token, p_track: !preview && !auth.user });
  const q = data as PublicQuote | null;
  if (!q) notFound();
  const open = q.status === "sent" || q.status === "viewed";

  return (
    <div className="min-h-screen bg-canvas">
      <div className="h-1.5 bg-red" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[22px] font-semibold tracking-tight">{q.business.name}</div>
            <div className="text-[13.5px] text-muted">{q.business.city}</div>
          </div>
          {q.business.phone && (
            <a href={`tel:${q.business.phone}`} className="btn btn-ghost">
              <Phone size={14} /> {q.business.phone}
            </a>
          )}
        </header>

        <main className="mt-8 grid gap-6 md:grid-cols-[1fr_280px]">
          <section className="card overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <div className="eyebrow">Quote {q.number}</div>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{q.title}</h1>
              <p className="mt-1 text-[13.5px] text-muted">
                Prepared for {q.contact.name}
                {q.contact.address ? ` · ${q.contact.address}` : ""}
                {q.sent_at ? ` · ${shortDate(q.sent_at)}` : ""}
              </p>
            </div>
            <table className="w-full text-[14px]">
              <tbody>
                {q.items.map((it, i) => (
                  <tr key={i} className={i ? "border-t border-line" : ""}>
                    <td className="px-6 py-3.5">
                      {it.description}
                      {it.qty > 1 && <span className="text-muted"> × {it.qty}</span>}
                    </td>
                    <td className="num px-6 py-3.5 text-right font-medium">{money(it.qty * it.unit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink">
                  <td className="px-6 py-4 font-semibold">Total</td>
                  <td className="num px-6 py-4 text-right text-[20px] font-semibold">{money(q.amount, { cents: true })}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <aside className="space-y-4">
            {open ? (
              <div className="card p-5">
                {q.valid_until && (
                  <p className="mb-4 rounded-lg bg-sun-soft px-3 py-2 text-[13px] font-medium text-sun-deep ring-1 ring-sun-line">Price held until {shortDate(q.valid_until)}</p>
                )}
                <Decide token={token} customer={q.contact.name ?? ""} />
              </div>
            ) : q.status === "accepted" ? (
              <div className="rounded-2xl bg-ink p-6 text-white">
                <p className="text-[17px] font-semibold">Approved</p>
                <p className="mt-1 text-[13.5px] text-white/70">
                  By {q.accepted_by} on {q.decided_at ? shortDate(q.decided_at) : ""}. Thank you!
                </p>
              </div>
            ) : (
              <div className="card p-5 text-[14px] text-muted">This quote is closed. Call us if you&apos;d like a fresh one.</div>
            )}
            <p className="px-1 text-[12.5px] leading-relaxed text-muted">Questions? Reply to the message this link came in, or call {q.business.owner?.split(" ")[0] ?? "us"} directly.</p>
          </aside>
        </main>
      </div>
    </div>
  );
}
