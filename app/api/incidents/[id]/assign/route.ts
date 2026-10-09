import { apiRoute, readJson, requireUser } from "@/backend/http";
import { assignIncident } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  return await assignIncident(await requireUser(), id, await readJson(req));
});
