import { apiRoute, readJson, requireUser } from "@/backend/http";
import { getClientProfile, updateClient } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  return await getClientProfile(await requireUser(), id);
});

export const PATCH = apiRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  return await updateClient(await requireUser(), id, await readJson(req));
});
