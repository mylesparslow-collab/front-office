import { Pill } from "./ui";
import type { Invoice, Quote, Stage } from "@/lib/types";
import { daysLate, balance } from "@/lib/metrics";
import type { ChaseState } from "@/lib/chase";

export function QuoteStatus({ q }: { q: Quote }) {
  switch (q.status) {
    case "draft":
      return <Pill tone="line">Draft</Pill>;
    case "sent":
      return <Pill tone="sun" dot>Waiting</Pill>;
    case "viewed":
      return <Pill tone="sun" dot>Opened</Pill>;
    case "accepted":
      return <Pill tone="ink">Accepted</Pill>;
    case "declined":
      return <Pill tone="muted">Declined</Pill>;
    default:
      return <Pill tone="muted">Expired</Pill>;
  }
}

export function InvoiceStatus({ i, now }: { i: Invoice; now: Date }) {
  if (balance(i) <= 0) return <Pill tone="ink">Paid</Pill>;
  const d = daysLate(i, now);
  if (d > 0) return <Pill tone="red" dot>{d} days late</Pill>;
  if (i.paid > 0) return <Pill tone="sun">Part paid</Pill>;
  if (d >= -3) return <Pill tone="sun">Due {d === 0 ? "today" : `in ${-d} days`}</Pill>;
  return <Pill tone="line">Due in {-d} days</Pill>;
}

export const STAGES: { key: Stage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Talking" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function ChasePill({ st }: { st: ChaseState | null }) {
  if (!st) return null;
  switch (st.status) {
    case "replied":
      return <Pill tone="red" dot>Replied</Pill>;
    case "running":
      return <Pill tone="sun" dot>Needs OK</Pill>;
    case "waiting":
      return <Pill tone="line">Chasing</Pill>;
    case "paused":
      return <Pill tone="muted">Paused</Pill>;
    case "finished":
      return st.kind === "invoice" && st.steps.length && st.reason.includes("phone") ? <Pill tone="red">Call them</Pill> : <Pill tone="muted">Done</Pill>;
    default:
      return <Pill tone="muted">Off</Pill>;
  }
}
