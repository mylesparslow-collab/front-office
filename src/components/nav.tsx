"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, FileText, Inbox, LayoutGrid, Receipt, Settings, Sparkles, Sun } from "lucide-react";

const items = [
  { href: "/app", label: "Today", icon: Sun, exact: true },
  { href: "/app/pipeline", label: "Pipeline", icon: LayoutGrid },
  { href: "/app/quotes", label: "Quotes", icon: FileText },
  { href: "/app/invoices", label: "Invoices", icon: Receipt },
  { href: "/app/chasers", label: "Follow-ups", icon: Inbox },
  { href: "/app/automations", label: "Automations", icon: Sparkles },
  { href: "/app/numbers", label: "Numbers", icon: BarChart3 },
];

export function SideNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  const active = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + "/"));
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition",
            active(href, exact) ? "bg-paper text-ink shadow-[var(--shadow-card)] ring-1 ring-line" : "text-ink-2 hover:bg-paper/70 hover:text-ink",
          )}
        >
          <Icon size={16} strokeWidth={2} className={active(href, exact) ? "text-red" : "text-faint group-hover:text-muted"} />
          <span className="flex-1">{label}</span>
          {counts[href] ? (
            <span className={clsx("num min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5", href === "/app/chasers" ? "bg-red text-white" : "bg-sun-soft text-sun-deep ring-1 ring-sun-line")}>
              {counts[href]}
            </span>
          ) : null}
        </Link>
      ))}
      <Link
        href="/app/settings"
        className={clsx(
          "mt-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition",
          active("/app/settings") ? "bg-paper text-ink ring-1 ring-line" : "text-muted hover:text-ink",
        )}
      >
        <Settings size={16} className={active("/app/settings") ? "text-red" : "text-faint"} />
        Settings
      </Link>
    </nav>
  );
}

export function BottomNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  const active = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + "/"));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={clsx("relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium", active(href, exact) ? "text-red" : "text-muted")}>
          <Icon size={18} />
          {label === "Follow-ups" ? "Follow" : label === "Automations" ? "Auto" : label}
          {counts[href] ? <span className="absolute top-1 right-[22%] size-2 rounded-full bg-red ring-2 ring-paper" /> : null}
        </Link>
      ))}
    </nav>
  );
}
