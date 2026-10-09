import { apiRoute, requireAdminPin, requireUser } from "@/backend/http";
import { getOverview } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const user = await requireUser();
  await requireAdminPin(user);
  return getOverview(user);
});
