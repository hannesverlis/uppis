import { apiRoute, requireUser } from "@/backend/http";
import { listClients } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => listClients(await requireUser()));
