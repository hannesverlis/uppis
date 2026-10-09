import { apiRoute, readJson, requireAdminPin, requireUser } from "@/backend/http";
import { createUser, listAdminUsers } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const user = await requireUser();
  await requireAdminPin(user);
  return listAdminUsers(user);
});

export const POST = apiRoute(async (req) => {
  const user = await requireUser();
  await requireAdminPin(user);
  return createUser(user, await readJson(req));
});
