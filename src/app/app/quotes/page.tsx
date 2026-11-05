import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { loadWorkspace } from "@/lib/workspace";
import { chaseState } from "@/lib/chase";
import { avgDaysToYes, openQuotes, winRate } from "@/lib/metrics";
import { daysBetween, money, relative } from "@/lib/format";
import { Avatar, Empty, PageHeader, Stat } from "@/components/ui";
import { ChasePill, QuoteStatus } from "@/components/status";

export const metadata = { title: "Quotes" };

const VIEWS = [
  { key: "open", label: "Waiting" },
  { key: "draft", label: "Drafts" },
  { key: "won", label: "Accepted" },
  { key: "all", label: "All" },
] as const;

export default async function Quotes({ searchParams }: PageProps<"/app/quotes">) {
  const ws = await loadWorkspace();
  const { now } = ws;
  const view = (((await searchParams).view as string) ?? "open") as (typeof VIEWS)[number]["key"];
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const open = openQuotes(ws.quotes);
  const rows = ws.quotes.filter((q) => (view === "open" ? q.status === "sent" || q.status === "viewed" : view === "draft" ? q.status === "draft" : view === "won" ? q.status === "accepted" : true));
  const wr = winRate(ws.quotes, now);
  const dy = avgDaysToYes(ws.quotes);

  return (
    <div className="rise">
      <PageHeader
        title="Quotes"
        sub="Every sent quote is followed up until the customer says yes or no."
        actions={
          <Link href="/app/quotes/new" className="btn btn-primary">
            <Plus size={15} /> New quote
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-4">
        <Stat label="Waiting on a decision" tone="sun" value={money(open.reduce((s, q) => s + q.amount, 0))} note={`${open.length} quotes`} />
        <Stat label="Win rate" value={wr === null ? "—" : `${Math.round(wr * 100)}%`} note="Last 120 days" />
        <Stat label="Time to yes" value={dy === null ? "—" : `${Math.round(dy)} days`} note="Sent to accepted, on average" />
      </div>
      <div className="mb-3 flex gap-1">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/app/quotes?view=${v.key}`} className={clsx("rounded-lg px-3 py-1.5 text-[13px] font-semibold", view === v.key ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink")}>
            {v.label}
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty title="No quotes here yet">Build a quote in a minute and Front Office follows up for you.</Empty>
        ) : (
          <ul>
            {rows.map((q) => {
              const c = q.contact_id ? contacts.get(q.contact_id) : undefined;
              const st = chaseState({ kind: "quote", item: q }, ws.cadences.quote, ws.messages, now);
              const age = q.sent_at ? daysBetween(new Date(q.sent_at), now) : null;
              return (
                <li key={q.id} className="table-row first:border-t-0">
                  <Link href={`/app/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar name={c?.name ?? "?"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{c?.company ?? c?.name ?? "Customer"}</span>
                        <QuoteStatus q={q} />
                      </div>
                      <div className="truncate text-[12.5px] text-muted">
                        {q.number} · {q.title}
                        {q.sent_at && ` · sent ${relative(q.sent_at, now)}`}
                        {q.viewed_at && q.status === "viewed" && ` · opened ${relative(q.viewed_at, now)}`}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <ChasePill st={st} />
                    </div>
                    <div className="w-28 text-right">
                      <div className="num text-[14px] font-semibold">{money(q.amount)}</div>
                      {age !== null && (q.status === "sent" || q.status === "viewed") && (
                        <div className={clsx("num text-[12px]", age >= 10 ? "font-semibold text-red" : age >= 5 ? "text-sun-deep" : "text-muted")}>{age} days out</div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
