import Link from "next/link";
import { Logo } from "./ui";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute -top-24 -right-24 size-[420px] rounded-full bg-red/90 blur-[2px]" />
        <div className="absolute right-40 bottom-28 size-40 rounded-full bg-sun" />
        <div className="absolute inset-0 flex flex-col justify-end p-14">
          <p className="text-[12px] font-semibold tracking-[0.1em] text-sun uppercase">Front Office</p>
          <p className="mt-3 max-w-md text-[30px] leading-tight font-semibold tracking-tight text-white">Every quote followed up. Every invoice chased. Every lead answered.</p>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/60">You approve the messages. Front Office remembers who to nudge, when, and what to say.</p>
        </div>
      </div>
    </div>
  );
}
