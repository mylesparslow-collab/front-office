import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./form";

export const metadata = { title: "Create a workspace" };

export default function Signup() {
  return (
    <AuthShell>
      <h1 className="text-[22px] font-semibold tracking-tight">Create your workspace</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">Your quotes, invoices and leads stay private to your business.</p>
      <SignupForm />
      <p className="mt-6 text-center text-[13px] text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-red hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
