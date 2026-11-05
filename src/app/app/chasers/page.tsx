import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { chaseState, subjects } from "@/lib/chase";
import { firstName, relative, shortDate } from "@/lib/format";
import { Avatar, CardHeader, Empty, PageHeader, Pill } from "@/components/ui";
import { ApproveAllButton, ChannelIcon, QueuedCard, ReplyBox } from "./client";
import type { SubjectType } from "@/lib/types";

export const metadata = { title: "Follow-ups" };

export default async function Chasers() {
  const ws = await loadWorkspace();
  const { now } = ws;
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const all = subjects(ws);
  const find = (kind: SubjectType, id: string) => all.find((s) => s.kind === kind && s.item.id === id);
  const label = (kind: SubjectType, id: string) => {
    const s = find(kind, id);
    if (!s) return { text: kind, href: "#" };
    if (s.kind === "lead") return { text: `Lead · ${s.item.title}`, href: `/app/pipeline?lead=${id}` };
    return { text: `${s.item.number} · ${s.item.title}`, href: `/app/${kind}s/${id}` };
  };

  const queued = ws.messages.filter((m) => m.status === "queued").sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  const replied = all
    .map((s) => ({ s, st: chaseState(s, ws.cadences[s.kind], ws.messages, now) }))
    .filter((x) => x.st.status === "replied");
  const sent = ws.messages.filter((m) => m.direction === "out" && m.status === "sent").sort((a, b) => +new Date(b.sent_at!) - +new Date(a.sent_at!)).slice(0, 12);

  return (
    <div className="rise">
      <PageHeader
        title="Follow-ups"
        sub="Front Office writes every reminder and check-in from your templates. Nothing reaches a customer until you approve it."
        actions={
          <>
            <Pill tone={ws.business.sending_enabled ? "ink" : "line"}>{ws.business.sending_enabled ? "Delivery on" : "Review mode: approved messages are logged"}</Pill>
            {queued.length > 1 && <ApproveAllButton ids={queued.map((m) => m.id)} label={`Approve all ${queued.length}`} />}
          </>
        }
      />

      {replied.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red" /> Customers waiting on you · {replied.length}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {replied.map(({ s, st }) => {
              const c = s.item.contact_id ? contacts.get(s.item.contact_id) : undefined;
              const l = label(s.kind, s.item.id);
              return (
                <article key={s.item.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={c?.name ?? "Customer"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{c?.name ?? "Customer"}</div>
                      <Link href={l.href} className="block truncate text-[12.5px] text-muted hover:text-red">
                        {l.text}
                      </Link>
                    </div>
                    <span className="text-[12px] text-faint">{relative(st.lastInbound!.due_at, now)}</span>
                  </div>
                  <p className="mt-3 rounded-2xl rounded-tl-md bg-red-soft px-4 py-3 text-[14px] leading-relaxed text-ink ring-1 ring-red-line">{st.lastInbound!.body}</p>
                  <p className="mt-2 mb-3 text-[12px] text-muted">Automatic follow-ups are paused for this {s.kind} until you answer.</p>
                  <ReplyBox kind={s.kind} subjectId={s.item.id} contactId={s.item.contact_id} firstName={firstName(c?.name)} />
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="eyebrow mb-3 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-sun" /> Ready for your OK · {queued.length}
        </h2>
        {queued.length === 0 ? (
          <div className="card">
            <Empty title="No follow-ups waiting">When a quote goes quiet or an invoice comes due, the next message appears here, already written.</Empty>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {queued.map((m) => {
              const s = find(m.subject_type, m.subject_id);
              const steps = ws.cadences[m.subject_type];
              const step = m.step !== null ? steps[m.step] : undefined;
              const c = m.contact_id ? contacts.get(m.contact_id) : undefined;
              const l = label(m.subject_type, m.subject_id);
              let context = "";
              if (s?.kind === "invoice") {
                const d = Math.round((now.getTime() - new Date(s.item.due_on).getTime()) / 86400000);
                context = d > 0 ? `Invoice was due ${shortDate(s.item.due_on)}, ${d} days ago.` : `Invoice is due ${shortDate(s.item.due_on)}.`;
              } else if (s?.kind === "quote") {
                context = `Quote sent ${relative(s.item.sent_at!, now)}${s.item.viewed_at ? `, opened ${relative(s.item.viewed_at, now)}` : ", not opened yet"}.`;
              } else if (s?.kind === "lead") {
                context = `Lead came in ${relative(s.item.created_at, now)} from ${s.item.source}.`;
              }
              return (
                <QueuedCard
                  key={m.id}
                  id={m.id}
                  channel={m.channel}
                  subject={m.subject}
                  body={m.body}
                  to={c?.name ?? "Customer"}
                  about={l.text}
                  aboutHref={l.href}
                  stepLabel={step ? `Step ${m.step! + 1} of ${steps.length} · ${step.label}` : ""}
                  context={context}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <CardHeader title="Recently approved" sub="The last dozen messages, newest first." />
        <ul>
          {sent.map((m) => {
            const c = m.contact_id ? contacts.get(m.contact_id) : undefined;
            const l = label(m.subject_type, m.subject_id);
            return (
              <li key={m.id} className="table-row flex items-center gap-3 px-5 py-2.5 text-[13px]">
                <span className="text-muted">
                  <ChannelIcon channel={m.channel} />
                </span>
                <span className="w-36 shrink-0 truncate font-medium">{c?.name ?? "Customer"}</span>
                <Link href={l.href} className="min-w-0 flex-1 truncate text-muted hover:text-red">
                  {m.subject ?? m.body}
                </Link>
                <span className="shrink-0 text-[12px] text-faint">{relative(m.sent_at!, now)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
