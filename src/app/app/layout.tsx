import Link from "next/link";
import { LogOut, RotateCcw } from "lucide-react";
import { Logo } from "@/components/ui";
import { BottomNav, SideNav } from "@/components/nav";
import { loadWorkspace } from "@/lib/workspace";
import { openQuotes, waitingLeads } from "@/lib/metrics";
import { resetDemo, signOut } from "@/app/actions";
import { chaseState, subjects } from "@/lib/chase";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ws = await loadWorkspace();
  const queued = ws.messages.filter((m) => m.status === "queued").length;
  const replies = subjects(ws).filter((s) => chaseState(s, ws.cadences[s.kind], ws.messages, ws.now).status === "replied").length;
  const counts: Record<string, number> = {
    "/app/chasers": queued + replies,
    "/app/pipeline": waitingLeads(ws.leads).length,
    "/app/quotes": openQuotes(ws.quotes).length,
  };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-canvas px-3 py-5 lg:flex">
        <Link href="/app" className="px-2.5">
          <Logo />
        </Link>
        <div className="mx-2.5 mt-5 mb-4 rounded-xl bg-paper p-3 ring-1 ring-line">
          <div className="text-[13px] font-semibold leading-tight text-ink">{ws.business.name}</div>
          <div className="mt-0.5 truncate text-[12px] text-muted">{ws.business.city ?? ws.userEmail}</div>
        </div>
        <SideNav counts={counts} />
        <div className="mt-auto space-y-1 px-1">
          {ws.business.is_demo && (
            <form action={resetDemo}>
              <button className="btn btn-quiet btn-sm w-full justify-start">
                <RotateCcw size={14} /> Reset sample data
              </button>
            </form>
          )}
          <form action={signOut}>
            <button className="btn btn-quiet btn-sm w-full justify-start">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <span className="max-w-[50%] truncate text-[12.5px] font-medium text-muted">{ws.business.name}</span>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-14">{children}</main>
      </div>
      <BottomNav counts={counts} />
    </div>
  );
}
