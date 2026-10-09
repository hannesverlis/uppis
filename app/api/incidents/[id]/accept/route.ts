import { apiRoute, readJson, requireUser } from "@/backend/http";
import { acceptIncident } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  return await acceptIncident(await requireUser(), id, await readJson(req));
});
