import { apiRoute, requireUser } from "@/backend/http";
import { markArrived } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  return await markArrived(await requireUser(), id);
});
