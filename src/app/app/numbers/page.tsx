import { loadWorkspace } from "@/lib/workspace";
import { aging, avgDaysToPay, avgDaysToYes, collectedByMonth, medianResponseMinutes, onTimeRate, winRate, formatMinutes } from "@/lib/metrics";
import { compactMoney, daysBetween, money, parseDay } from "@/lib/format";
import { CardHeader, PageHeader, Stat } from "@/components/ui";
import { AgingBar, Funnel, MonthlyBars } from "@/components/charts";

export const metadata = { title: "Numbers" };

export default async function Numbers() {
  const ws = await loadWorkspace();
  const { now } = ws;
  const months = collectedByMonth(ws.invoices, now, 6);
  const sixMonth = months.reduce((s, m) => s + m.total, 0);
  const dtp = avgDaysToPay(ws.invoices, now);
  const otr = onTimeRate(ws.invoices, now);
  const wr = winRate(ws.quotes, now);
  const dy = avgDaysToYes(ws.quotes);
  const med = medianResponseMinutes(ws.leads);

  // What the follow-ups recovered: paid after at least one reminder, or accepted after at least one check-in.
  const sentFor = (kind: string, id: string, before: Date) =>
    ws.messages.filter((m) => m.subject_type === kind && m.subject_id === id && m.direction === "out" && m.status === "sent" && m.step !== null && new Date(m.sent_at!) <= before && (kind !== "invoice" || m.step > 0));
  const recoveredInv = ws.invoices.filter((i) => i.paid_on && i.paid >= i.amount && sentFor("invoice", i.id, parseDay(i.paid_on)).length > 0);
  const wonAfter = ws.quotes.filter((q) => q.status === "accepted" && q.decided_at && sentFor("quote", q.id, new Date(q.decided_at)).length > 0);

  const recent = ws.quotes.filter((q) => q.sent_at && daysBetween(new Date(q.sent_at), now) <= 120);
  const opened = recent.filter((q) => q.viewed_at || q.status === "accepted" || q.status === "declined");
  const accepted = recent.filter((q) => q.status === "accepted");

  const sources = new Map<string, { leads: number; won: number; value: number }>();
  for (const l of ws.leads) {
    const s = sources.get(l.source) ?? { leads: 0, won: 0, value: 0 };
    s.leads += 1;
    if (l.stage === "won") {
      s.won += 1;
      s.value += l.value;
    }
    sources.set(l.source, s);
  }

  return (
    <div className="rise">
      <PageHeader title="Numbers" sub="Straight from your quotes, invoices and leads. No spreadsheets." />

      <section className="mb-6 overflow-hidden rounded-[var(--radius-card)] bg-ink text-white">
        <div className="grid gap-px bg-white/10 sm:grid-cols-2">
          <div className="bg-ink p-6">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-sun uppercase">Collected after a reminder</div>
            <div className="num mt-2 text-[34px] font-semibold tracking-tight">{money(recoveredInv.reduce((s, i) => s + i.amount, 0))}</div>
            <p className="mt-1 text-[13px] text-white/60">{recoveredInv.length} invoices were paid only after a follow-up went out.</p>
          </div>
          <div className="bg-ink p-6">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-sun uppercase">Won after a check-in</div>
            <div className="num mt-2 text-[34px] font-semibold tracking-tight">{money(wonAfter.reduce((s, q) => s + q.amount, 0))}</div>
            <p className="mt-1 text-[13px] text-white/60">{wonAfter.length} quotes were accepted after at least one automatic check-in.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card">
          <CardHeader title="Cash collected" sub={`${money(sixMonth)} over the last six months`} />
          <div className="px-5 pb-5">
            <MonthlyBars rows={months} />
          </div>
        </section>
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Stat label="Days to get paid" value={dtp === null ? "—" : Math.round(dtp)} note="Invoice to payment, last 90 days" />
          <Stat label="Paid on time" value={otr === null ? "—" : `${Math.round(otr * 100)}%`} note="By the due date" tone={otr !== null && otr < 0.6 ? "sun" : undefined} />
          <Stat label="Quote win rate" value={wr === null ? "—" : `${Math.round(wr * 100)}%`} note="Last 120 days" />
          <Stat label="First reply to leads" value={med === null ? "—" : formatMinutes(med)} note="Median" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <CardHeader title="Money owed, by age" sub="Older balances get harder to collect. Red is the money at real risk." />
          <div className="px-5 pb-5">
            <AgingBar data={aging(ws.invoices, now)} />
          </div>
        </section>
        <section className="card">
          <CardHeader title="Quotes, last 120 days" sub={dy === null ? "" : `Accepted quotes took ${Math.round(dy)} days on average`} />
          <div className="px-5 pb-5">
            <Funnel
              steps={[
                { label: "Sent", value: recent.length, sub: compactMoney(recent.reduce((s, q) => s + q.amount, 0)) },
                { label: "Opened by the customer", value: opened.length },
                { label: "Accepted", value: accepted.length, sub: compactMoney(accepted.reduce((s, q) => s + q.amount, 0)) },
              ]}
            />
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <CardHeader title="Where jobs come from" />
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11.5px] tracking-wide text-muted uppercase">
              <th className="px-5 py-2.5 font-semibold">Source</th>
              <th className="px-3 py-2.5 text-right font-semibold">Leads</th>
              <th className="px-3 py-2.5 text-right font-semibold">Won</th>
              <th className="px-5 py-2.5 text-right font-semibold">Won value</th>
            </tr>
          </thead>
          <tbody>
            {[...sources.entries()]
              .sort((a, b) => b[1].value - a[1].value)
              .map(([src, s]) => (
                <tr key={src} className="table-row">
                  <td className="px-5 py-2.5 font-medium">{src}</td>
                  <td className="num px-3 py-2.5 text-right text-muted">{s.leads}</td>
                  <td className="num px-3 py-2.5 text-right text-muted">{s.won}</td>
                  <td className="num px-5 py-2.5 text-right font-semibold">{money(s.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
