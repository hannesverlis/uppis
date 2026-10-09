import { apiRoute, requireUser } from "@/backend/http";
import { listClients } from "@/backend/service";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => await listClients(await requireUser()));
