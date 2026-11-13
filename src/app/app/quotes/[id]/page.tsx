import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadWorkspace } from "@/lib/workspace";
import { stateFor } from "@/lib/chase";
import { money, shortDate, relative } from "@/lib/format";
import { QuoteStatus } from "@/components/status";
import { ChaseTimeline } from "@/components/timeline";
import { Thread } from "@/components/thread";
import { CustomerCard } from "@/components/customer";
import { LogReply, ReplyBox } from "../../chasers/client";
import { QuoteActions } from "./actions-bar";

export default async function QuotePage({ params }: PageProps<"/app/quotes/[id]">) {
  const { id } = await params;
  const ws = await loadWorkspace();
  const q = ws.quotes.find((x) => x.id === id);
  if (!q) notFound();
  const { now } = ws;
  const c = ws.contacts.find((x) => x.id === q.contact_id);
  const st = stateFor(ws, "quote", id, now)!;
  const inv = ws.invoices.find((i) => i.quote_id === q.id);
  const views = ws.activities.filter((a) => a.subject_type === "quote" && a.subject_id === id && a.kind === "viewed");

  return (
    <div className="rise">
      <Link href="/app/quotes" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Quotes
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="num text-[13px] font-semibold text-muted">{q.number}</span>
            <QuoteStatus q={q} />
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{q.title}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {c?.company ? `${c.company} · ${c.name}` : c?.name}
            {q.sent_at && ` · sent ${shortDate(q.sent_at)}`}
            {q.valid_until && q.status !== "accepted" && ` · price held to ${shortDate(q.valid_until)}`}
            {q.accepted_by && ` · accepted by ${q.accepted_by} ${relative(q.decided_at!, now)}`}
          </p>
        </div>
        <QuoteActions id={q.id} status={q.status} link={`${ws.baseUrl}/q/${q.public_token}`} previewLink={`${ws.baseUrl}/q/${q.public_token}?preview=1`} hasInvoice={!!inv} />
      </div>

      {q.status === "viewed" && q.viewed_at && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-sun-soft px-4 py-3 text-[13.5px] ring-1 ring-sun-line">
          <span className="size-2 rounded-full bg-sun" />
          <span>
            <span className="font-semibold">{c?.name.split(" ")[0]} opened this quote {relative(q.viewed_at, now)}</span>
            {views.length > 1 ? ` and has looked ${views.length} times.` : "."} Calls made while a quote is fresh close noticeably more often.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[11.5px] tracking-wide text-muted uppercase">
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-5 py-3">{it.description}</td>
                    <td className="num px-3 py-3 text-right text-muted">{it.qty}</td>
                    <td className="num px-3 py-3 text-right text-muted">{money(it.unit)}</td>
                    <td className="num px-5 py-3 text-right font-medium">{money(it.qty * it.unit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/80">
                  <td colSpan={3} className="px-5 py-3.5 text-right font-semibold">Total</td>
                  <td className="num px-5 py-3.5 text-right text-[17px] font-semibold">{money(q.amount, { cents: true })}</td>
                </tr>
              </tfoot>
            </table>
            {inv && (
              <Link href={`/app/invoices/${inv.id}`} className="block border-t border-line bg-canvas/60 px-5 py-3 text-[13px] font-medium text-ink-2 hover:text-red">
                Invoiced as {inv.number} →
              </Link>
            )}
          </section>
          <section className="card">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-[15px] font-semibold">Conversation</h2>
              {(q.status === "sent" || q.status === "viewed") && <LogReply kind="quote" subjectId={q.id} contactId={q.contact_id} />}
            </div>
            <Thread messages={ws.messages.filter((m) => m.subject_type === "quote" && m.subject_id === id)} activities={ws.activities.filter((a) => a.subject_type === "quote" && a.subject_id === id)} now={now} customer={c?.name ?? "Customer"} />
            {st.status === "replied" && (
              <div className="border-t border-line p-4">
                <ReplyBox kind="quote" subjectId={q.id} contactId={q.contact_id} firstName={c?.name.split(" ")[0] ?? "them"} />
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <ChaseTimeline st={st} pausable={q.status === "sent" || q.status === "viewed" ? { kind: "quote", id: q.id, paused: q.chase_paused } : undefined} />
          {c && <CustomerCard c={c} />}
        </div>
      </div>
    </div>
  );
}
