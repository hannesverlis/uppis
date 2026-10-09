import { apiRoute, requireUser } from "@/backend/http";
import { getQueue } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => getQueue(await requireUser()));
