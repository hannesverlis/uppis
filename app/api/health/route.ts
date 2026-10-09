import { apiRoute } from "@/backend/http";
import { getSupabasePublicConfig } from "@/backend/supabase";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => ({
  ok: true,
  supabase: getSupabasePublicConfig().configured,
}));
