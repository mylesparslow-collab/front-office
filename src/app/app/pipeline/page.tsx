import Link from "next/link";
import { FileText, X } from "lucide-react";
import { loadWorkspace } from "@/lib/workspace";
import { stateFor } from "@/lib/chase";
import { formatMinutes, medianResponseMinutes, pipelineValue } from "@/lib/metrics";
import { money, relative, firstName } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ChaseTimeline } from "@/components/timeline";
import { Thread } from "@/components/thread";
import { CustomerCard } from "@/components/customer";
import { ReplyBox } from "../chasers/client";
import { AddLead, Board, StageSelect, type Card } from "./board";

export const metadata = { title: "Pipeline" };

export default async function Pipeline({ searchParams }: PageProps<"/app/pipeline">) {
  const ws = await loadWorkspace();
  const { now } = ws;
  const sel = (await searchParams).lead as string | undefined;
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const cards: Card[] = ws.leads.map((l) => {
    const waiting = l.stage === "new" && !l.first_response_at;
    const mins = (now.getTime() - new Date(l.created_at).getTime()) / 60000;
    return {
      id: l.id,
      stage: l.stage,
      title: l.title,
      who: (l.contact_id && contacts.get(l.contact_id)?.name) || "Unknown",
      value: l.value,
      source: l.source,
      waiting,
      hot: waiting && mins > 30,
      age: waiting ? formatMinutes(mins) : relative(l.last_touch_at ?? l.created_at, now),
    };
  });
  const med = medianResponseMinutes(ws.leads);
  const lead = sel ? ws.leads.find((l) => l.id === sel) : undefined;
  const lc = lead?.contact_id ? contacts.get(lead.contact_id) : undefined;
  const leadQuote = lead ? ws.quotes.find((q) => q.lead_id === lead.id) : undefined;

  return (
    <div className="rise">
      <PageHeader
        title="Pipeline"
        sub={`${money(pipelineValue(ws.leads))} in open jobs · median first reply ${med ? formatMinutes(med) : "—"} · drag cards between columns`}
        actions={<AddLead contacts={ws.contacts} />}
      />
      <Board cards={cards} />

      {lead && (
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/25 backdrop-blur-[1px]">
          <Link href="/app/pipeline" scroll={false} className="flex-1" aria-label="Close" />
          <aside className="h-full w-full max-w-[520px] overflow-y-auto bg-canvas shadow-[var(--shadow-pop)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">{lc?.name ?? "Lead"}</div>
                <div className="truncate text-[12.5px] text-muted">
                  {lead.source} · came in {relative(lead.created_at, now)}
                </div>
              </div>
              <Link href="/app/pipeline" scroll={false} className="btn btn-quiet btn-sm" aria-label="Close">
                <X size={16} />
              </Link>
            </div>
            <div className="space-y-5 p-5">
              <section className="card p-5">
                <div className="eyebrow">Job</div>
                <h2 className="mt-1 text-[19px] font-semibold tracking-tight">{lead.title}</h2>
                <p className="num mt-1 text-[14px] text-ink-2">{money(lead.value)} estimated</p>
                {lead.notes && <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">{lead.notes}</p>}
                {lead.lost_reason && <p className="mt-3 text-[13px] text-muted">Lost: {lead.lost_reason}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StageSelect id={lead.id} stage={lead.stage} />
                  {leadQuote ? (
                    <Link href={`/app/quotes/${leadQuote.id}`} className="btn btn-ghost">
                      <FileText size={14} /> {leadQuote.number}
                    </Link>
                  ) : (
                    lead.stage !== "lost" && (
                      <Link href={`/app/quotes/new?lead=${lead.id}`} className="btn btn-primary">
                        <FileText size={14} /> Build quote
                      </Link>
                    )
                  )}
                </div>
              </section>
              {lead.stage === "new" && !lead.first_response_at && (
                <section className="card p-4">
                  <p className="mb-2 text-[13px] font-semibold">Reply now. Leads answered in the first hour book far more often.</p>
                  <ReplyBox kind="lead" subjectId={lead.id} contactId={lead.contact_id} firstName={firstName(lc?.name)} />
                </section>
              )}
              <ChaseTimeline st={stateFor(ws, "lead", lead.id, now)!} />
              <section className="card">
                <h2 className="px-5 pt-4 pb-3 text-[15px] font-semibold">History</h2>
                <Thread messages={ws.messages.filter((m) => m.subject_type === "lead" && m.subject_id === lead.id)} activities={ws.activities.filter((a) => a.subject_type === "lead" && a.subject_id === lead.id)} now={now} customer={lc?.name ?? "Customer"} />
              </section>
              {lc && <CustomerCard c={lc} />}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
