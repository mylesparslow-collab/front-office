import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";

export const metadata = { title: "Set up" };

export default async function Onboarding() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { count } = await supabase.from("memberships").select("*", { count: "exact", head: true }).eq("user_id", data.user.id);
  if (count) redirect("/app");
  return (
    <AuthShell>
      <h1 className="text-[22px] font-semibold tracking-tight">Tell us about your business</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">We&apos;ll set you up with follow-up templates that work for most service businesses. You can change every word later.</p>
      <OnboardingForm />
    </AuthShell>
  );
}
