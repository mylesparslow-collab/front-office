import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerCard } from "@/components/customer";
import { loadWorkspace } from "@/lib/workspace";
import { stateFor } from "@/lib/chase";
import { balance, daysLate } from "@/lib/metrics";
import { money, shortDate } from "@/lib/format";
import { InvoiceStatus } from "@/components/status";
import { ChaseTimeline } from "@/components/timeline";
import { Thread } from "@/components/thread";
import { RecordPayment } from "@/components/payment";
import { LogReply, ReplyBox } from "../../chasers/client";

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[id]">) {
  const { id } = await params;
  const ws = await loadWorkspace();
  const inv = ws.invoices.find((i) => i.id === id);
  if (!inv) notFound();
  const { now } = ws;
  const c = ws.contacts.find((x) => x.id === inv.contact_id);
  const st = stateFor(ws, "invoice", id, now)!;
  const bal = balance(inv);
  const quote = inv.quote_id ? ws.quotes.find((q) => q.id === inv.quote_id) : undefined;

  return (
    <div className="rise">
      <Link href="/app/invoices" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Invoices
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="num text-[13px] font-semibold text-muted">{inv.number}</span>
            <InvoiceStatus i={inv} now={now} />
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{inv.title}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {c?.company ? `${c.company} · ${c.name}` : c?.name} · issued {shortDate(inv.issued_on)} · due {shortDate(inv.due_on)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="eyebrow">{bal > 0 ? "Balance" : "Paid"}</div>
            <div className={`num text-[30px] font-semibold tracking-tight ${bal > 0 && daysLate(inv, now) > 0 ? "text-red" : ""}`}>{money(bal > 0 ? bal : inv.amount, { cents: true })}</div>
          </div>
          {bal > 0 && <RecordPayment id={inv.id} balance={bal} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[
                ["Invoice total", money(inv.amount, { cents: true })],
                ["Paid", money(inv.paid, { cents: true })],
                [bal > 0 ? (daysLate(inv, now) > 0 ? "Days late" : "Due in") : "Paid on", bal > 0 ? `${Math.abs(daysLate(inv, now))} days` : shortDate(inv.paid_on!)],
              ].map(([k, v]) => (
                <div key={k} className="px-5 py-4">
                  <div className="eyebrow">{k}</div>
                  <div className="num mt-1 text-[17px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
            {quote && (
              <Link href={`/app/quotes/${quote.id}`} className="block border-b border-line px-5 py-3 text-[13px] text-muted hover:text-red">
                From quote {quote.number}, accepted by {quote.accepted_by ?? "the customer"}
              </Link>
            )}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-[15px] font-semibold">Conversation</h2>
              <LogReply kind="invoice" subjectId={inv.id} contactId={inv.contact_id} />
            </div>
            <Thread messages={ws.messages.filter((m) => m.subject_type === "invoice" && m.subject_id === id)} activities={ws.activities.filter((a) => a.subject_type === "invoice" && a.subject_id === id)} now={now} customer={c?.name ?? "Customer"} />
            {st.status === "replied" && (
              <div className="border-t border-line p-4">
                <ReplyBox kind="invoice" subjectId={inv.id} contactId={inv.contact_id} firstName={c?.name.split(" ")[0] ?? "them"} />
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <ChaseTimeline st={st} pausable={bal > 0 ? { kind: "invoice", id: inv.id, paused: inv.chase_paused } : undefined} />
          {c && <CustomerCard c={c} />}
        </div>
      </div>
    </div>
  );
}
