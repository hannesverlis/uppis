import { apiRoute, readJson, setUserCookie } from "@/backend/http";
import { chooseUser } from "@/backend/service";

export const dynamic = "force-dynamic";

export const POST = apiRoute(async (req) => {
  const body = await readJson(req);
  const userId = typeof body.userId === "string" && body.userId ? body.userId : null;
  const result = chooseUser(userId);
  await setUserCookie(userId);
  return result;
});
