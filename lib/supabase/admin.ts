import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Service-role client for the cron job. Bypasses RLS — never use it with user input as the scope. */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
