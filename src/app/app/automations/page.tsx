import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Mail, MessageSquareText, ShieldCheck, Star, PhoneMissed, Zap, FileText, Receipt } from "lucide-react";
import { loadWorkspace } from "@/lib/workspace";
import { buildBrief } from "@/lib/brief";
import { AUTOMATIONS, CHARTER, type AutomationId } from "@/lib/automations";
import { balance, daysLate, formatMinutes, medianResponseMinutes, openQuotes } from "@/lib/metrics";
import { compactMoney, daysBetween, parseDay } from "@/lib/format";
import { CardHeader, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Automations" };

const icons: Record<AutomationId, typeof Zap> = { lead: Zap, quote: FileText, invoice: Receipt, review: Star, missed: PhoneMissed, brief: CalendarClock };

export default async function Automations() {
  const ws = await loadWorkspace();
  const { now } = ws;
  const brief = buildBrief(ws, now);

  const med = medianResponseMinutes(ws.leads.filter((l) => daysBetween(new Date(l.created_at), now) <= 30));
  const open = openQuotes(ws.quotes);
  const late = ws.invoices.filter((i) => balance(i) > 0 && daysLate(i, now) > 0);
  const finished = ws.invoices.filter((i) => i.paid_on && i.paid >= i.amount && daysBetween(parseDay(i.paid_on), now) <= 14);
  const calls = ws.leads.filter((l) => l.source === "Phone" && daysBetween(new Date(l.created_at), now) <= 30);
  const stat: Record<AutomationId, string> = {
    lead: med ? `Typical reply ${formatMinutes(med)}` : "No leads yet",
    quote: `${open.length} out · ${compactMoney(open.reduce((s, q) => s + q.amount, 0))}`,
    invoice: `${late.length} overdue · ${compactMoney(late.reduce((s, i) => s + balance(i), 0))}`,
    review: `${finished.length} finished job${finished.length === 1 ? "" : "s"} ready to ask`,
    missed: `${calls.length} phone lead${calls.length === 1 ? "" : "s"} this month`,
    brief: "Next: Monday 7:00 am",
  };

  return (
    <div className="rise">
      <PageHeader
        title="Automations"
        sub="Six things that happen on their own, and the rules each one follows. You stay in charge of what reaches a customer."
        actions={<Pill tone={ws.business.sending_enabled ? "ink" : "line"}>{ws.business.sending_enabled ? "Delivery on" : "Review mode: you approve everything"}</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AUTOMATIONS.map((a) => {
          const Icon = icons[a.id];
          const body = (
            <>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-soft text-red">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold leading-tight text-ink">{a.name}</h2>
                  <p className="mt-0.5 text-[12.5px] text-muted">{a.trigger}</p>
                </div>
              </div>
              <div className="num mt-3 text-[13px] font-semibold text-ink-2">{stat[a.id]}</div>
              <ol className="mt-3 space-y-1.5">
                {a.steps.map((s) => (
                  <li key={s} className="flex gap-2 text-[13px] text-ink-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-faint" />
                    {s}
                  </li>
                ))}
              </ol>
              {a.id !== "brief" && (
                <div className="mt-3 rounded-lg bg-canvas p-3 ring-1 ring-line">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">
                    {a.sample.channel === "sms" ? <MessageSquareText size={12} /> : <Mail size={12} />} Draft wording
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-ink-2">{a.sample.body}</p>
                </div>
              )}
              <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">
                <span className="font-semibold text-ink-2">Your part: </span>
                {a.ownerStep}
              </p>
            </>
          );
          return a.href ? (
            <Link key={a.id} href={a.href} className="card block p-5 transition hover:ring-1 hover:ring-line-2">
              {body}
            </Link>
          ) : (
            <section key={a.id} className="card p-5">
              {body}
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card h-fit overflow-hidden">
          <CardHeader title="This Monday's brief" sub="Built from your numbers right now. Goes to you only." />
          <div className="mx-5 mb-5 rounded-xl bg-canvas p-4 ring-1 ring-line">
            <p className="text-[14px] font-semibold text-ink">{brief.greeting}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">{brief.headline}</p>
            <dl className="mt-3 divide-y divide-line">
              {brief.lines.map((l) => (
                <div key={l.label} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <dt className="text-[12px] font-semibold tracking-wide text-faint uppercase">{l.label}</dt>
                    <dd className="mt-0.5 text-[12.5px] text-muted">{l.detail}</dd>
                  </div>
                  <span className={`num shrink-0 text-[17px] font-semibold ${l.tone === "red" ? "text-red" : l.tone === "sun" ? "text-sun-deep" : "text-ink"}`}>{l.value}</span>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-sun-soft p-3 ring-1 ring-sun-line">
              <ArrowRight size={14} className="mt-0.5 shrink-0 text-sun-deep" />
              <p className="text-[13px] text-ink">
                <span className="font-semibold">One thing first: </span>
                {brief.oneThing}
              </p>
            </div>
          </div>
        </section>
        <section className="card h-fit overflow-hidden">
          <CardHeader title="House rules" sub="Apply to every automation." right={<ShieldCheck size={18} className="text-red" />} />
          <div className="px-5 pb-5">
            <ul className="mt-2 space-y-1.5">
              {CHARTER.map((c) => (
                <li key={c} className="flex gap-2 text-[13px] text-ink-2">
                  <Check size={14} className="mt-0.5 shrink-0 text-sun-deep" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

        </section>
      </div>

      <div className="mt-6">
        <section className="card overflow-hidden">
          <CardHeader title="Approval rules" sub="What each automation may do alone, what waits for you, and what it never does." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line bg-canvas text-[11px] font-semibold tracking-wide text-faint uppercase">
                  <th className="px-5 py-2">Automation</th>
                  <th className="px-3 py-2">May do alone</th>
                  <th className="px-3 py-2">Waits for you</th>
                  <th className="px-5 py-2">Never</th>
                </tr>
              </thead>
              <tbody>
                {AUTOMATIONS.map((a) => (
                  <tr key={a.id} className="table-row align-top">
                    <td className="px-5 py-3 font-semibold text-ink">{a.name}</td>
                    <td className="px-3 py-3 text-ink-2">{a.rules.alone}</td>
                    <td className="px-3 py-3 text-ink-2">{a.rules.waits}</td>
                    <td className="px-5 py-3 text-red-deep">{a.rules.never}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
