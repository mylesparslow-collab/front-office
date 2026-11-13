import clsx from "clsx";
import { Mail, MessageSquare } from "lucide-react";
import type { Activity, Message } from "@/lib/types";
import { relative } from "@/lib/format";

/** Messages and events for one quote, invoice or lead, oldest first. */
export function Thread({ messages, activities, now, customer }: { messages: Message[]; activities: Activity[]; now: Date; customer: string }) {
  const rows = [
    ...messages.filter((m) => m.status === "sent" || m.status === "received").map((m) => ({ t: +new Date(m.sent_at ?? m.due_at), m })),
    ...activities.map((a) => ({ t: +new Date(a.created_at), a })),
  ].sort((x, y) => x.t - y.t);
  if (!rows.length) return <p className="px-5 pb-5 text-[13px] text-muted">No history yet.</p>;
  return (
    <ol className="space-y-3 px-5 pb-5">
      {rows.map((r, i) => {
        if ("a" in r && r.a) {
          return (
            <li key={i} className="flex items-center gap-2 text-[12.5px] text-muted">
              <span className={clsx("size-1.5 rounded-full", r.a.kind === "accepted" || r.a.kind === "payment" ? "bg-red" : r.a.kind === "viewed" ? "bg-sun" : "bg-line-2")} />
              <span className={clsx(r.a.kind === "payment" || r.a.kind === "accepted" ? "font-semibold text-ink" : "")}>{r.a.body}</span>
              <span className="text-faint">· {relative(r.a.created_at, now)}</span>
            </li>
          );
        }
        const m = (r as { m: Message }).m;
        const inbound = m.direction === "in";
        return (
          <li key={i} className={clsx("flex", inbound ? "justify-start" : "justify-end")}>
            <div className={clsx("max-w-[85%]")}>
              <div className={clsx("mb-1 flex items-center gap-1.5 text-[11.5px] text-muted", !inbound && "justify-end")}>
                {m.channel === "sms" ? <MessageSquare size={11} /> : <Mail size={11} />}
                {inbound ? customer : m.step !== null ? "Automatic follow-up" : "You"} · {relative(m.sent_at ?? m.due_at, now)}
              </div>
              <div
                className={clsx(
                  "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line",
                  inbound ? "rounded-tl-md bg-red-soft text-ink ring-1 ring-red-line" : "rounded-tr-md bg-canvas text-ink-2 ring-1 ring-line",
                )}
              >
                {m.subject && <span className="mb-0.5 block font-semibold text-ink">{m.subject}</span>}
                {m.body}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
