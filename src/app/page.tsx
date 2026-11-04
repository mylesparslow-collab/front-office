import Link from "next/link";
import { ArrowRight, Check, FileText, MessageSquare, Receipt, Zap } from "lucide-react";
import { Logo } from "@/components/ui";
import { openDemo } from "./actions";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-quiet">
            Sign in
          </Link>
          <form action={openDemo}>
            <button className="btn btn-dark">Live demo</button>
          </form>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div className="rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-sun-soft px-3 py-1 text-[12.5px] font-semibold text-sun-deep ring-1 ring-sun-line">
            <span className="size-1.5 rounded-full bg-sun" /> For service businesses that quote and invoice
          </span>
          <h1 className="mt-5 text-[44px] leading-[1.04] font-semibold tracking-[-0.03em] sm:text-[58px]">
            Get paid. <span className="text-red">Win the quote.</span> Never let a lead go cold.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
            Front Office writes every follow-up for your open quotes, late invoices and new leads, and stops the moment a customer replies or pays. You just approve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <form action={openDemo}>
              <button className="btn btn-primary h-11 px-5 text-[15px]">
                Explore the live demo <ArrowRight size={16} />
              </button>
            </form>
            <Link href="/signup" className="btn btn-ghost h-11 px-5 text-[15px]">
              Create a workspace
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-muted">The demo opens a real workspace for a sample heating and air company.</p>
        </div>

        <div className="rise relative" style={{ animationDelay: "120ms" }}>
          <div className="absolute -top-8 -right-6 size-48 rounded-full bg-sun/80 blur-[1px]" />
          <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-red" />
          <div className="card relative overflow-hidden shadow-[var(--shadow-pop)]">
            <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-line-2" />
              <span className="size-2.5 rounded-full bg-line-2" />
              <span className="size-2.5 rounded-full bg-line-2" />
              <span className="ml-3 text-[12px] font-medium text-muted">Today</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line">
              <div className="bg-paper p-4">
                <div className="eyebrow flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-red" />
                  Overdue
                </div>
                <div className="num mt-1.5 text-[26px] font-semibold text-red">$28.7k</div>
                <div className="text-[12px] text-muted">7 invoices past due</div>
              </div>
              <div className="bg-paper p-4">
                <div className="eyebrow flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-sun" />
                  Quotes waiting
                </div>
                <div className="num mt-1.5 text-[26px] font-semibold">$49.7k</div>
                <div className="text-[12px] text-muted">5 out for a decision</div>
              </div>
            </div>
            <div className="space-y-2.5 p-4">
              {[
                { icon: MessageSquare, tone: "red", t: "Luis replied", d: "“Paycheck hits Friday, I’ll pay the full amount then.”" },
                { icon: Zap, tone: "red", t: "New lead: Priya Raman", d: "AC blowing warm air · Website · waiting 1.6 h" },
                { icon: FileText, tone: "sun", t: "David is looking at Q-2098", d: "$16,250 · opened yesterday" },
              ].map((r) => (
                <div key={r.t} className="flex items-start gap-3 rounded-xl p-2.5 ring-1 ring-line">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${r.tone === "red" ? "bg-red-soft text-red" : "bg-sun-soft text-sun-deep"}`}>
                    <r.icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold">{r.t}</div>
                    <div className="truncate text-[12.5px] text-muted">{r.d}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-sun-soft px-3.5 py-3 ring-1 ring-sun-line">
                <span className="text-[13px] font-semibold">4 follow-ups written and ready</span>
                <span className="btn btn-primary btn-sm pointer-events-none">
                  <Check size={13} /> Approve
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-16 md:grid-cols-3 md:gap-10">
          {[
            { icon: FileText, h: "Quotes that follow up on themselves", p: "A check-in on day 2, a text on day 5, a price-hold note on day 9. Customers approve online with one tap, and you see the moment they open it." },
            { icon: Receipt, h: "Invoices that actually get paid", p: "A friendly heads-up before the due date, then firmer reminders on a schedule you set. Record a payment and the reminders stop." },
            { icon: Zap, h: "Leads answered in minutes", p: "New inquiries get an instant reply drafted for you and land at the top of your day, with how long they have been waiting." },
          ].map((f) => (
            <div key={f.h} className="py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-paper text-red ring-1 ring-line">
                <f.icon size={18} />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{f.h}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{f.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-xl text-[32px] leading-tight font-semibold tracking-tight">You stay in charge of every word.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["1", "Send a quote or invoice", "Build it in a minute, or bring the ones you already have."],
            ["2", "Front Office writes the follow-ups", "From templates in your voice, signed with your name."],
            ["3", "You approve in a tap", "Edit anything, skip anything, or approve the whole batch."],
            ["4", "It stops on its own", "When a customer replies, accepts or pays, chasing ends."],
          ].map(([n, h, p]) => (
            <div key={n} className="card p-5">
              <span className="num text-[13px] font-bold text-red">{n}</span>
              <h3 className="mt-2 text-[15px] font-semibold">{h}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
          <h2 className="max-w-lg text-[28px] leading-tight font-semibold tracking-tight text-white">
            See it running on a real workspace, <span className="text-sun">right now.</span>
          </h2>
          <form action={openDemo}>
            <button className="btn btn-primary h-11 px-5 text-[15px]">
              Open the demo <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px] text-muted">
        <Logo />
        <span>Built and set up by MLP Consulting</span>
      </footer>
    </div>
  );
}
