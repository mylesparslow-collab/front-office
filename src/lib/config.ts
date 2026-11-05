// Public values. The publishable key is designed to ship in browsers; row-level
// security is what protects the data. Env vars override these for other projects.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bkycetowyqnlrnrdznzr.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__NB48FxJULwoQAAiz27XBA_MFbrMngA";
