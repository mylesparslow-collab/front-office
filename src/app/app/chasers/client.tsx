"use client";

import { useState, useTransition } from "react";
import { Check, Mail, MessageSquare, Pencil, X, CornerDownRight, Loader2 } from "lucide-react";
import clsx from "clsx";
import { approveAll, approveMessage, logCustomerReply, sendReply, skipMessage } from "@/app/actions";
import type { SubjectType } from "@/lib/types";

export function ApproveAllButton({ ids, label }: { ids: string[]; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(() => approveAll(ids))}>
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      {label}
    </button>
  );
}

export function ChannelIcon({ channel }: { channel: "email" | "sms" }) {
  return channel === "sms" ? <MessageSquare size={14} /> : <Mail size={14} />;
}

export function QueuedCard({
  id,
  channel,
  subject,
  body,
  to,
  about,
  aboutHref,
  stepLabel,
  context,
}: {
  id: string;
  channel: "email" | "sms";
  subject: string | null;
  body: string;
  to: string;
  about: string;
  aboutHref: string;
  stepLabel: string;
  context: string;
}) {
  const [editing, setEditing] = useState(false);
  const [s, setS] = useState(subject ?? "");
  const [b, setB] = useState(body);
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <article className={clsx("card overflow-hidden transition", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-canvas/60 px-5 py-2.5 text-[12.5px]">
        <span className={clsx("inline-flex items-center gap-1.5 font-semibold", channel === "sms" ? "text-sun-deep" : "text-ink-2")}>
          <ChannelIcon channel={channel} /> {channel === "sms" ? "Text" : "Email"}
        </span>
        <span className="text-muted">to</span>
        <span className="font-semibold text-ink">{to}</span>
        <span className="text-faint">·</span>
        <a href={aboutHref} className="truncate font-medium text-ink-2 hover:text-red hover:underline">
          {about}
        </a>
        <span className="ml-auto text-muted">{stepLabel}</span>
      </div>
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-2">
            {channel === "email" && <input className="field" value={s} onChange={(e) => setS(e.target.value)} aria-label="Subject" />}
            <textarea className="field min-h-36" value={b} onChange={(e) => setB(e.target.value)} aria-label="Message" />
          </div>
        ) : (
          <>
            {channel === "email" && s && <p className="mb-1.5 text-[14px] font-semibold text-ink">{s}</p>}
            <p className={clsx("whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2", channel === "sms" && "inline-block max-w-md rounded-2xl rounded-bl-md bg-sun-soft px-3.5 py-2.5 ring-1 ring-sun-line")}>{b}</p>
          </>
        )}
        <p className="mt-3 text-[12px] text-muted">{context}</p>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        <button
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await approveMessage(id, editing ? b : undefined, editing && channel === "email" ? s : undefined);
              setGone(true);
            })
          }
        >
          <Check size={14} /> Approve
        </button>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setEditing((e) => !e)}>
          <Pencil size={13} /> {editing ? "Done editing" : "Edit"}
        </button>
        <button
          className="btn btn-quiet btn-sm ml-auto"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await skipMessage(id);
              setGone(true);
            })
          }
        >
          <X size={14} /> Skip this one
        </button>
      </div>
    </article>
  );
}

export function ReplyBox({ kind, subjectId, contactId, firstName, compact }: { kind: SubjectType; subjectId: string; contactId: string | null; firstName: string; compact?: boolean }) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  if (sent) return <p className="text-[13px] font-medium text-ink-2">Logged. Automatic follow-ups pick back up from here.</p>;
  return (
    <div className={clsx("rounded-xl bg-canvas p-2 ring-1 ring-line", compact && "mt-2")}>
      <textarea className="field min-h-20 border-0 bg-transparent shadow-none focus:shadow-none" placeholder={`Reply to ${firstName}…`} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-2 px-1 pb-1">
        <div className="flex rounded-lg bg-paper p-0.5 ring-1 ring-line">
          {(["sms", "email"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setChannel(c)} className={clsx("rounded-md px-2.5 py-1 text-[12px] font-semibold", channel === c ? "bg-ink text-white" : "text-muted")}>
              {c === "sms" ? "Text" : "Email"}
            </button>
          ))}
        </div>
        <button
          className="btn btn-quiet btn-sm ml-auto"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await sendReply(kind, subjectId, contactId, "Handled by phone.", "sms");
              setSent(true);
            })
          }
        >
          Handled it by phone
        </button>
        <button
          className="btn btn-dark btn-sm"
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              await sendReply(kind, subjectId, contactId, text, channel);
              setSent(true);
            })
          }
        >
          <CornerDownRight size={14} /> Send reply
        </button>
      </div>
    </div>
  );
}

export function LogReply({ kind, subjectId, contactId }: { kind: SubjectType; subjectId: string; contactId: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button className="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>
        <MessageSquare size={13} /> Log a customer reply
      </button>
    );
  return (
    <div className="w-full space-y-2">
      <textarea className="field min-h-20" placeholder="What did they say? (a call, a text to your phone…)" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <button
          className="btn btn-dark btn-sm"
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              await logCustomerReply(kind, subjectId, contactId, text);
              setOpen(false);
              setText("");
            })
          }
        >
          Save reply
        </button>
        <button className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
