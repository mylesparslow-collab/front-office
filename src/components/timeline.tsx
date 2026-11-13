import clsx from "clsx";
import { Check, Mail, MessageSquare } from "lucide-react";
import type { ChaseState } from "@/lib/chase";
import { shortDate } from "@/lib/format";
import { ChasePill } from "./status";
import { PauseToggle } from "./pause-toggle";

export function ChaseTimeline({ st, pausable }: { st: ChaseState; pausable?: { kind: "quote" | "invoice"; id: string; paused: boolean } }) {
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div>
          <h2 className="text-[15px] font-semibold">Automatic follow-up</h2>
          <p className="mt-0.5 text-[13px] text-muted">{st.reason}</p>
        </div>
        <ChasePill st={st} />
      </div>
      <ol className="relative px-5 pt-2 pb-4">
        {st.steps.map((s, i) => {
          const last = i === st.steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && <span className={clsx("absolute top-6 left-[11px] h-[calc(100%-18px)] w-px", s.status === "sent" ? "bg-ink/70" : "bg-line-2")} />}
              <span
                className={clsx(
                  "z-10 mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full ring-1",
                  s.status === "sent" && "bg-ink text-white ring-ink",
                  s.status === "queued" && "bg-sun text-ink ring-sun",
                  s.status === "next" && "bg-sun-soft text-sun-deep ring-sun",
                  (s.status === "upcoming" || s.status === "skipped" || s.status === "cancelled") && "bg-paper text-faint ring-line-2",
                )}
              >
                {s.status === "sent" ? <Check size={12} strokeWidth={3} /> : s.step.channel === "sms" ? <MessageSquare size={11} /> : <Mail size={11} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={clsx("text-[13.5px] font-medium", (s.status === "skipped" || s.status === "cancelled") && "text-faint line-through", s.status === "upcoming" && "text-ink-2")}>{s.step.label}</span>
                  <span className="text-[12px] text-muted">
                    {s.step.channel === "sms" ? "Text" : "Email"} ·{" "}
                    {s.status === "sent" ? `sent ${shortDate(s.at)}` : s.status === "queued" ? "written, waiting for your OK" : s.status === "skipped" ? "skipped" : s.status === "cancelled" ? "not needed" : shortDate(s.at)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {pausable && (
        <div className="border-t border-line px-5 py-3">
          <PauseToggle {...pausable} />
        </div>
      )}
    </section>
  );
}
