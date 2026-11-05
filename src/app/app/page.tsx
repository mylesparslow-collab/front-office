import Link from "next/link";
import { ArrowRight, Clock, Eye, MessageCircle, PhoneCall, Zap } from "lucide-react";
import { loadWorkspace } from "@/lib/workspace";
import { aging, balance, collectedThisMonth, daysLate, medianResponseMinutes, openQuotes, overdueTotal, waitingLeads, formatMinutes, avgDaysToPay } from "@/lib/metrics";
import { chaseState, subjects } from "@/lib/chase";
import { compactMoney, daysBetween, money, relative, firstName } from "@/lib/format";
import { Avatar, CardHeader, Empty, Pill, Stat } from "@/components/ui";
import { AgingBar } from "@/components/charts";
import { InvoiceStatus } from "@/components/status";
import { ApproveAllButton } from "./chasers/client";

export const metadata = { title: "Today" };

type Task = { key: string; tone: "red" | "sun" | "ink"; icon: typeof Zap; title: string; detail: string; href: string; cta: string; when?: string };

export default async function Today() {
  const ws = await loadWorkspace();
  const { now } = ws;
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const name = (id: string | null) => (id ? contacts.get(id)?.name ?? "Customer" : "Customer");

  const overdue = ws.invoices.filter((i) => balance(i) > 0 && daysLate(i, now) > 0).sort((a, b) => balance(b) - balance(a));
  const open = openQuotes(ws.quotes);
  const openValue = open.reduce((s, q) => s + q.amount, 0);
  const waiting = waitingLeads(ws.leads);
  const queued = ws.messages.filter((m) => m.status === "queued");
  const med = medianResponseMinutes(ws.leads);
  const dtp = avgDaysToPay(ws.invoices, now);

  const tasks: Task[] = [];
  for (const s of subjects(ws)) {
    const st = chaseState(s, ws.cadences[s.kind], ws.messages, now);
    const who = name(s.item.contact_id);
    const href = s.kind === "lead" ? `/app/pipeline?lead=${s.item.id}` : `/app/${s.kind}s/${s.item.id}`;
    if (st.status === "replied" && st.lastInbound) {
      tasks.push({ key: "r" + s.item.id, tone: "red", icon: MessageCircle, title: `${who} replied`, detail: `“${st.lastInbound.body}”`, href, cta: "Answer", when: relative(st.lastInbound.due_at, now) });
    }
    if (s.kind === "invoice" && st.status === "finished" && balance(s.item) > 0) {
      tasks.push({ key: "c" + s.item.id, tone: "red", icon: PhoneCall, title: `Call ${who} about ${s.item.number}`, detail: `${money(balance(s.item))} is ${daysLate(s.item, now)} days late and every reminder has gone out.`, href, cta: "Open" });
    }
  }
  for (const l of waiting) {
    const mins = (now.getTime() - new Date(l.created_at).getTime()) / 60000;
    tasks.push({ key: "l" + l.id, tone: mins > 60 ? "red" : "sun", icon: Zap, title: `New lead: ${name(l.contact_id)}`, detail: `${l.title} · ${l.source} · waiting ${formatMinutes(mins)}`, href: `/app/pipeline?lead=${l.id}`, cta: "Respond" });
  }
  for (const q of open) {
    if (q.status === "viewed" && q.viewed_at && daysBetween(new Date(q.viewed_at), now) <= 2) {
      tasks.push({ key: "v" + q.id, tone: "sun", icon: Eye, title: `${name(q.contact_id)} is looking at ${q.number}`, detail: `${money(q.amount)} · opened ${relative(q.viewed_at, now)}. A quick call now closes more jobs.`, href: `/app/quotes/${q.id}`, cta: "Open" });
    }
  }
  const order = { red: 0, sun: 1, ink: 2 };
  tasks.sort((a, b) => order[a.tone] - order[b.tone]);

  const hour = now.getUTCHours() - 8;
  const greet = hour < 12 && hour >= 0 ? "Good morning" : hour < 17 && hour >= 0 ? "Good afternoon" : "Good evening";
  const ag = aging(ws.invoices, now);
  const quiet = [...open].sort((a, b) => +new Date(a.sent_at!) - +new Date(b.sent_at!));

  return (
    <div className="rise">
      <div className="mb-7">
        <p className="text-[13px] font-medium text-muted">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles" })}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          {greet}, {firstName(ws.business.owner_name ?? "there")}.
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {tasks.length + (queued.length ? 1 : 0) === 0 ? "Nothing needs you right now. Front Office is following up for you." : `${tasks.length + (queued.length ? 1 : 0)} things need you. Everything else is being followed up automatically.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Overdue" tone="red" value={compactMoney(overdueTotal(ws.invoices, now))} note={`${overdue.length} invoices past due`} href="/app/invoices?view=overdue" />
        <Stat label="Quotes waiting" tone="sun" value={compactMoney(openValue)} note={`${open.length} quotes out for a decision`} href="/app/quotes" />
        <Stat label="Collected this month" value={compactMoney(collectedThisMonth(ws.invoices, now))} note={dtp ? `Customers pay in ${Math.round(dtp)} days on average` : "No payments yet"} href="/app/numbers" />
        <Stat label="Lead response" value={med ? formatMinutes(med) : "—"} note={waiting.length ? `${waiting.length} new ${waiting.length === 1 ? "lead is" : "leads are"} waiting` : "Median time to first reply"} href="/app/pipeline" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="card overflow-hidden">
          <CardHeader title="Needs you" sub="Ranked by money at stake and how long it has waited." right={queued.length ? <ApproveAllButton ids={queued.map((m) => m.id)} label={`Approve ${queued.length} follow-ups`} /> : null} />
          {queued.length > 0 && (
            <Link href="/app/chasers" className="mx-5 mb-3 flex items-center gap-3 rounded-xl bg-sun-soft px-4 py-3 ring-1 ring-sun-line transition hover:ring-sun">
              <Clock size={16} className="text-sun-deep" />
              <div className="flex-1 text-[13.5px]">
                <span className="font-semibold text-ink">{queued.length} follow-ups are written and ready.</span> <span className="text-ink-2">Read them, edit if you like, and approve.</span>
              </div>
              <ArrowRight size={15} className="text-sun-deep" />
            </Link>
          )}
          {tasks.length === 0 ? (
            <Empty title="You're all caught up">New replies, leads and late payers show up here.</Empty>
          ) : (
            <ul>
              {tasks.slice(0, 8).map((t) => (
                <li key={t.key} className="table-row">
                  <Link href={t.href} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${t.tone === "red" ? "bg-red-soft text-red" : "bg-sun-soft text-sun-deep"}`}>
                      <t.icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink">{t.title}</span>
                        {t.when && <span className="text-[12px] text-faint">{t.when}</span>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{t.detail}</p>
                    </div>
                    <span className="btn btn-ghost btn-sm mt-0.5 hidden sm:inline-flex">{t.cta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <CardHeader title="Money owed to you" sub={`${money(Object.values(ag).reduce((s, b) => s + b.total, 0))} open across ${Object.values(ag).reduce((s, b) => s + b.count, 0)} invoices`} right={<Link href="/app/invoices" className="text-[13px] font-medium text-red hover:underline">All invoices</Link>} />
            <div className="px-5 pb-4">
              <AgingBar data={ag} />
            </div>
            <ul>
              {overdue.slice(0, 4).map((i) => (
                <li key={i.id} className="table-row">
                  <Link href={`/app/invoices/${i.id}`} className="flex items-center gap-3 px-5 py-2.5">
                    <Avatar name={name(i.contact_id)} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{name(i.contact_id)}</div>
                      <div className="truncate text-[12px] text-muted">{i.number} · {i.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[13.5px] font-semibold">{money(balance(i))}</div>
                      <InvoiceStatus i={i} now={now} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <CardHeader title="Quotes going quiet" sub="Oldest first. Each one is being followed up." right={<Link href="/app/quotes" className="text-[13px] font-medium text-red hover:underline">All quotes</Link>} />
            <ul>
              {quiet.slice(0, 4).map((q) => {
                const age = daysBetween(new Date(q.sent_at!), now);
                return (
                  <li key={q.id} className="table-row">
                    <Link href={`/app/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{name(q.contact_id)}</div>
                        <div className="truncate text-[12px] text-muted">{q.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="num text-[13.5px] font-semibold">{money(q.amount)}</div>
                        <Pill tone={age >= 10 ? "red" : age >= 5 ? "sun" : "line"}>{age === 0 ? "Sent today" : `${age} days`}</Pill>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
