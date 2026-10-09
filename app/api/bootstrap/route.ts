import { apiRoute, getSessionUser } from "@/backend/http";
import { listSwitcherUsers, sessionPayload } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const me = await getSessionUser();
  return {
    users: listSwitcherUsers(),
    me: sessionPayload(me),
  };
});
