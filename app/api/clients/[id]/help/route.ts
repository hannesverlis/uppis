import { apiRoute, requireUser } from "@/backend/http";
import { getHelpView } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  return getHelpView(await requireUser(), id);
});
