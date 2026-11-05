import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { openDemo } from "@/app/actions";
import { LoginForm } from "./form";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-[22px] font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">Welcome back. Your follow-ups kept working while you were out.</p>
      <LoginForm next={sp.next as string | undefined} />
      <div className="my-6 flex items-center gap-3 text-[12px] text-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <form action={openDemo}>
        <button className="btn btn-primary w-full">
          Explore the live demo <ArrowRight size={15} />
        </button>
      </form>
      {sp.error === "demo" && <p className="mt-2 text-[13px] text-red">The demo is being refreshed. Try again in a minute.</p>}
      <p className="mt-6 text-center text-[13px] text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-red hover:underline">
          Create a workspace
        </Link>
      </p>
    </AuthShell>
  );
}
