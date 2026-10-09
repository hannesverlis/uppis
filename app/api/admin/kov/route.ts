import { apiRoute, requireAdminPin, requireUser } from "@/backend/http";
import { getKov } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const user = await requireUser();
  await requireAdminPin(user);
  return await getKov(user);
});
