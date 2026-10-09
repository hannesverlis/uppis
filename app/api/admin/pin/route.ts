import { ApiError } from "@/backend/errors";
import { apiRoute, expectedAdminPin, readJson, requireUser, setAdminPinCookie } from "@/backend/http";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const user = await requireUser();
  const isAdmin = user.roles.includes("admin_system") || user.roles.includes("admin_kov");
  if (!isAdmin) throw new ApiError("Puudub õigus", 403, "FORBIDDEN");
  const body = await readJson(req);
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (pin !== expectedAdminPin()) throw new ApiError("Vale PIN", 401, "PIN");
  await setAdminPinCookie();
  return { ok: true };
});
