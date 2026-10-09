import { apiRoute, requireUser } from "@/backend/http";
import { cancelIncident } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  return await cancelIncident(await requireUser(), id);
});
