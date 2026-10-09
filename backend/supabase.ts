export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * The hackathon demo runs on the local JSON store in backend/store.ts.
 * When Supabase keys are present, schema.sql and seed.sql can be applied there.
 * The service role key must stay on the server.
 */
export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    configured: isSupabaseConfigured(),
  };
}
