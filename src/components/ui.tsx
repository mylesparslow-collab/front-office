import clsx from "clsx";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="1" y="1" width="20" height="20" rx="6" fill="#d7263d" />
        <path d="M7 15.5V6.5h7.5M7 11h5.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="16" cy="15.5" r="2" fill="#f5b82e" />
      </svg>
      <span className={light ? "text-white" : "text-ink"}>Front Office</span>
    </span>
  );
}

type Tone = "red" | "sun" | "ink" | "muted" | "line";
const toneClass: Record<Tone, string> = {
  red: "bg-red-soft text-red-deep ring-red-line",
  sun: "bg-sun-soft text-sun-deep ring-sun-line",
  ink: "bg-ink text-white ring-ink",
  muted: "bg-canvas text-muted ring-line-2",
  line: "bg-paper text-ink-2 ring-line-2",
};

export function Pill({ tone = "muted", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset whitespace-nowrap", toneClass[tone], className)}>
      {dot && <span className={clsx("size-1.5 rounded-full", tone === "red" ? "bg-red" : tone === "sun" ? "bg-sun" : "bg-current")} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 3;
  const styles = ["bg-red-soft text-red-deep", "bg-sun-soft text-sun-deep", "bg-canvas text-ink-2 ring-1 ring-line-2"];
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", styles[h])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-sun-soft ring-1 ring-sun-line">
        <span className="size-2 rounded-full bg-sun" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "red" | "sun";
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        {tone && <span className={clsx("size-2 rounded-full", tone === "red" ? "bg-red pulse-dot" : "bg-sun")} />}
        <span className="eyebrow">{label}</span>
      </div>
      <div className={clsx("num mt-2 text-[30px] font-semibold leading-none tracking-tight", tone === "red" ? "text-red" : "text-ink")}>{value}</div>
      {note && <div className="mt-2 text-[12.5px] text-muted">{note}</div>}
    </>
  );
  const cls = clsx("card block p-5 transition", href && "hover:border-line-2 hover:shadow-[var(--shadow-pop)]", tone === "sun" && "border-t-[3px] border-t-sun", tone === "red" && "border-t-[3px] border-t-red");
  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
