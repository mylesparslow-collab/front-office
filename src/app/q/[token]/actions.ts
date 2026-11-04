"use server";

import { createClient } from "@/lib/supabase/server";

export async function decidePublicQuote(token: string, accept: boolean, name: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_quote", { p_token: token, p_accept: accept, p_name: name });
  if (error) return "error";
  return data as string;
}
