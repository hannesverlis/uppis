import { apiRoute, readJson, requireUser } from "@/backend/http";
import { addHelper, removeHelper } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  return addHelper(await requireUser(), id, await readJson(req));
});

export const DELETE = apiRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  return removeHelper(await requireUser(), id, await readJson(req));
});
