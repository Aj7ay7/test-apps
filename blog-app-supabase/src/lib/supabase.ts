import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for browser / client components (Auth, Realtime, Storage).
 * Database access uses Prisma + DATABASE_URL (Supabase Postgres).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createSupabaseClient(url, anonKey);
}
