import { apiRoute, requireUser } from "@/backend/http";
import { resetDemo } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async () => {
  return await resetDemo(await requireUser());
});
