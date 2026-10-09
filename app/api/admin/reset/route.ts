import { apiRoute, requireAdminPin, requireUser } from "@/backend/http";
import { resetDemo } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async () => {
  const user = await requireUser();
  await requireAdminPin(user);
  return resetDemo(user);
});
