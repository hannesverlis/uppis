import { apiRoute, requireUser } from "@/backend/http";
import { getOrg } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => getOrg(await requireUser()));
