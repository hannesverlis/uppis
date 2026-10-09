import { apiRoute, readJson, requireAdminPin, requireUser } from "@/backend/http";
import { markKov } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req, ctx) => {
  const user = await requireUser();
  await requireAdminPin(user);
  const { incidentId } = await ctx.params;
  return await markKov(user, incidentId, await readJson(req));
});
