import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /demo: opens a private copy of the sample workspace. Shareable as a plain link. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) return NextResponse.redirect(new URL("/login?error=demo", request.url));
  }
  const { error } = await supabase.rpc("start_demo");
  if (error) return NextResponse.redirect(new URL("/login?error=demo", request.url));
  return NextResponse.redirect(new URL("/app", request.url));
}
