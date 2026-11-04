import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { loadWorkspace } from "@/lib/workspace";
import { balance, daysLate, overdueTotal, aging } from "@/lib/metrics";
import { chaseState } from "@/lib/chase";
import { money, shortDate } from "@/lib/format";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { ChasePill, InvoiceStatus } from "@/components/status";
import { AgingBar } from "@/components/charts";

export const metadata = { title: "Invoices" };

const VIEWS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
] as const;

export default async function Invoices({ searchParams }: PageProps<"/app/invoices">) {
  const ws = await loadWorkspace();
  const { now } = ws;
  const view = (((await searchParams).view as string) ?? "open") as (typeof VIEWS)[number]["key"];
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const rows = ws.invoices
    .filter((i) => (view === "open" ? balance(i) > 0 : view === "overdue" ? balance(i) > 0 && daysLate(i, now) > 0 : view === "paid" ? balance(i) <= 0 : true))
    .sort((a, b) => (view === "paid" ? +new Date(b.paid_on ?? 0) - +new Date(a.paid_on ?? 0) : daysLate(b, now) - daysLate(a, now)));
  const openTotal = ws.invoices.reduce((s, i) => s + balance(i), 0);

  return (
    <div className="rise">
      <PageHeader
        title="Invoices"
        sub={`${money(openTotal)} open · ${money(overdueTotal(ws.invoices, now))} overdue`}
        actions={
          <Link href="/app/invoices/new" className="btn btn-primary">
            <Plus size={15} /> New invoice
          </Link>
        }
      />
      <div className="card mb-5 p-5">
        <AgingBar data={aging(ws.invoices, now)} />
      </div>
      <div className="mb-3 flex gap-1">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/app/invoices?view=${v.key}`} className={clsx("rounded-lg px-3 py-1.5 text-[13px] font-semibold", view === v.key ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink")}>
            {v.label}
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty title="Nothing here">Invoices you create show up here with their follow-up status.</Empty>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead className="hidden text-[11.5px] font-semibold tracking-wide text-muted uppercase sm:table-header-group">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Due</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Follow-up</th>
                <th className="px-5 py-2.5 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const c = i.contact_id ? contacts.get(i.contact_id) : undefined;
                const st = chaseState({ kind: "invoice", item: i }, ws.cadences.invoice, ws.messages, now);
                return (
                  <tr key={i.id} className="table-row">
                    <td className="px-5 py-3">
                      <Link href={`/app/invoices/${i.id}`} className="flex items-center gap-3">
                        <Avatar name={c?.name ?? "?"} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{c?.company ?? c?.name ?? "Customer"}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {i.number} · {i.title}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="num hidden px-3 py-3 text-ink-2 sm:table-cell">{shortDate(i.due_on)}</td>
                    <td className="px-3 py-3">
                      <InvoiceStatus i={i} now={now} />
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <ChasePill st={st} />
                    </td>
                    <td className={clsx("num px-5 py-3 text-right font-semibold", daysLate(i, now) > 30 && balance(i) > 0 && "text-red")}>{money(balance(i) > 0 ? balance(i) : i.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
