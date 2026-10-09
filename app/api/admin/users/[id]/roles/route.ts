import { apiRoute, readJson, requireAdminPin, requireUser } from "@/backend/http";
import { changeRole } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req, ctx) => {
  const user = await requireUser();
  await requireAdminPin(user);
  const { id } = await ctx.params;
  return changeRole(user, id, await readJson(req));
});
