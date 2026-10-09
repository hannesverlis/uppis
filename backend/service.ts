import { randomUUID } from "crypto";
import { ApiError } from "./errors";
import { DEMO_USER_ORDER } from "./ids";
import { can } from "./permissions";
import { buildSession, homeFor } from "./session";
import { readDb, resetDb, updateDb } from "./store";
import { needsEmergency, parseTriage } from "./triage";
import type {
  Client,
  Db,
  Incident,
  IncidentStatus,
  KovStatus,
  Outcome,
  Role,
  SessionUser,
  User,
} from "./types";
import { ROLES } from "./types";

const ACTIVE: IncidentStatus[] = ["open", "escalated_112", "helper_on_way", "helper_arrived"];
const WAIT_MS = 10 * 60 * 1000;
const FINISHED_MS = 10 * 1000;
const CANCEL_NOTICE_MS = 30 * 1000;
const ETA = new Set([5, 10, 20, 40]);

function userById(db: Db, id: string | null | undefined) {
  if (!id) return null;
  return db.users.find((item) => item.id === id) ?? null;
}

function nameOf(db: Db, id: string | null | undefined) {
  return userById(db, id)?.name ?? null;
}

function municipalityName(db: Db, id: string) {
  return db.municipalities.find((item) => item.id === id)?.name ?? "";
}

function orgName(db: Db, id: string | null) {
  if (!id) return null;
  return db.organizations.find((item) => item.id === id)?.name ?? null;
}

function clientById(db: Db, id: string) {
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new ApiError("Klienti ei leitud", 404, "NOT_FOUND");
  return client;
}

function incidentById(db: Db, id: string) {
  const incident = db.incidents.find((item) => item.id === id);
  if (!incident) throw new ApiError("Juhtumit ei leitud", 404, "NOT_FOUND");
  return incident;
}

function rolesOf(db: Db, userId: string): Role[] {
  return db.userRoles.filter((item) => item.userId === userId).map((item) => item.role);
}

function resourceForClient(client: Client) {
  return {
    clientId: client.id,
    municipalityId: client.municipalityId,
    kovConsent: client.kovConsent,
  };
}

function resourceForIncident(incident: Incident, client: Client) {
  return {
    ...resourceForClient(client),
    incident: {
      clientId: incident.clientId,
      status: incident.status,
      helperUserId: incident.helperUserId,
    },
  };
}

function assertCan(user: SessionUser, action: Parameters<typeof can>[1], resource?: Parameters<typeof can>[2]) {
  if (!can(user, action, resource)) throw new ApiError("Puudub õigus", 403, "FORBIDDEN");
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function activeFor(db: Db, clientId: string) {
  return (
    db.incidents
      .filter((item) => item.clientId === clientId && ACTIVE.includes(item.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

function isWaitingLong(incident: Incident) {
  return incident.status === "open" && Date.now() - new Date(incident.createdAt).getTime() > WAIT_MS;
}

function latestFor(db: Db, clientId: string) {
  return (
    db.incidents
      .filter((item) => item.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

function recentResolved(db: Db, clientId: string) {
  const latest = latestFor(db, clientId);
  if (!latest || !latest.resolvedAt) return null;
  if (latest.status !== "resolved" && latest.status !== "cancelled") return null;
  if (Date.now() - new Date(latest.resolvedAt).getTime() > FINISHED_MS) return null;
  return {
    id: latest.id,
    status: latest.status,
    outcome: latest.outcome,
    resolvedAt: latest.resolvedAt,
  };
}

function publicUser(db: Db, user: User) {
  return {
    id: user.id,
    name: user.name,
    roles: rolesOf(db, user.id),
  };
}

export function listSwitcherUsers() {
  const db = readDb();
  const rank = new Map<string, number>();
  DEMO_USER_ORDER.forEach((id, index) => rank.set(id, index));
  return db.users
    .map((user) => publicUser(db, user))
    .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

export function sessionPayload(user: SessionUser | null) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    roles: user.roles,
    organizationId: user.organizationId,
    municipalityId: user.municipalityId,
    redirectTo: homeFor(user),
  };
}

export function chooseUser(userId: string | null) {
  if (!userId) return { me: null, redirectTo: "/" };
  const user = buildSession(readDb(), userId);
  if (!user) throw new ApiError("Kasutajat ei leitud", 404, "NOT_FOUND");
  return { me: sessionPayload(user), redirectTo: homeFor(user) };
}

export function listClients(user: SessionUser) {
  const db = readDb();
  return db.clients
    .filter((client) => can(user, "view_client", resourceForClient(client)))
    .map((client) => ({
      id: client.id,
      name: nameOf(db, client.elderUserId),
      address: client.address,
      municipalityName: municipalityName(db, client.municipalityId),
      relation: relationLabel(db, client, user),
      canCall: can(user, "call_help", resourceForClient(client)),
      canEdit: can(user, "edit_client", resourceForClient(client)),
    }));
}

function relationLabel(db: Db, client: Client, user: SessionUser) {
  if (client.elderUserId === user.id) return "abisaaja";
  return db.clientContacts.find((item) => item.clientId === client.id && item.userId === user.id)?.relation ?? "";
}

export function getHelpView(user: SessionUser, clientId: string) {
  const db = readDb();
  const client = clientById(db, clientId);
  assertCan(user, "view_client", resourceForClient(client));
  const active = activeFor(db, client.id);
  return {
    clientId: client.id,
    clientName: nameOf(db, client.elderUserId),
    canCall: can(user, "call_help", resourceForClient(client)),
    canCancel: active ? can(user, "cancel_incident", resourceForIncident(active, client)) : false,
    active: active
      ? {
          id: active.id,
          status: active.status,
          createdAt: active.createdAt,
          helperName: nameOf(db, active.helperUserId),
          helperEtaMin: active.helperEtaMin,
          acceptedAt: active.acceptedAt ?? null,
          arrivedAt: active.arrivedAt ?? null,
          outcome: active.outcome,
          outcomeNote: active.outcomeNote,
          waitingLong: isWaitingLong(active),
        }
      : null,
    finished: active ? null : recentResolved(db, client.id),
  };
}

export function getClientProfile(user: SessionUser, clientId: string) {
  const db = readDb();
  const client = clientById(db, clientId);
  const resource = resourceForClient(client);
  assertCan(user, "view_client", resource);
  const elder = userById(db, client.elderUserId);
  const canEdit = can(user, "edit_client", resource);
  const canAccess = can(user, "view_access", resource);

  const helpers = db.clientHelpers
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => a.priority - b.priority)
    .map((item) => ({
      userId: item.userId,
      organizationId: item.organizationId,
      priority: item.priority,
      label: item.userId ? nameOf(db, item.userId) : orgName(db, item.organizationId),
    }));

  const incidents = db.incidents
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      status: item.status,
      outcome: item.outcome,
      helperName: nameOf(db, item.helperUserId),
    }));

  return {
    id: client.id,
    elderName: elder?.name ?? "",
    phone: elder?.phone ?? null,
    address: client.address,
    municipalityName: municipalityName(db, client.municipalityId),
    accessNotes: canAccess ? client.accessNotes : null,
    kovConsent: client.kovConsent,
    canEdit,
    canManageHelpers: can(user, "manage_helpers", resource),
    canSetConsent: can(user, "set_kov_consent", resource),
    contacts: db.clientContacts
      .filter((item) => item.clientId === client.id)
      .map((item) => ({
        name: nameOf(db, item.userId),
        relation: item.relation,
        phone: userById(db, item.userId)?.phone ?? null,
      })),
    helpers,
    helperOptions: can(user, "manage_helpers", resource) ? helperOptions(db) : { users: [], organizations: [] },
    incidents,
  };
}

function helperOptions(db: Db) {
  const helperIds = new Set(
    db.userRoles
      .filter((item) => item.role.startsWith("helper_"))
      .map((item) => item.userId),
  );
  return {
    users: db.users.filter((item) => helperIds.has(item.id)).map((item) => ({ id: item.id, name: item.name })),
    organizations: db.organizations.map((item) => ({ id: item.id, name: item.name })),
  };
}

export function updateClient(user: SessionUser, clientId: string, body: Record<string, unknown>) {
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const client = clientById(db, clientId);
    const resource = resourceForClient(client);
    if ("address" in body || "accessNotes" in body) {
      assertCan(session, "edit_client", resource);
      if ("address" in body) client.address = text(body.address, 200);
      if ("accessNotes" in body) client.accessNotes = text(body.accessNotes, 500);
    }
    if ("kovConsent" in body) {
      assertCan(session, "set_kov_consent", resource);
      client.kovConsent = body.kovConsent === true;
    }
  });
  return getClientProfile(buildSession(readDb(), user.id)!, clientId);
}

export function addHelper(user: SessionUser, clientId: string, body: Record<string, unknown>) {
  const helperUserId = text(body.userId, 80) || null;
  const organizationId = text(body.organizationId, 80) || null;
  if (!helperUserId && !organizationId) throw new ApiError("Vali täitja või organisatsioon", 400, "VALIDATION");

  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const client = clientById(db, clientId);
    assertCan(session, "manage_helpers", resourceForClient(client));
    if (helperUserId && !rolesOf(db, helperUserId).some((role) => role.startsWith("helper_"))) {
      throw new ApiError("See kasutaja ei ole täitja", 400, "VALIDATION");
    }
    if (organizationId && !db.organizations.some((item) => item.id === organizationId)) {
      throw new ApiError("Organisatsiooni ei leitud", 404, "NOT_FOUND");
    }
    const exists = db.clientHelpers.some(
      (item) =>
        item.clientId === clientId &&
        item.userId === helperUserId &&
        item.organizationId === organizationId,
    );
    if (exists) return;
    const priority = db.clientHelpers.filter((item) => item.clientId === clientId).length + 1;
    db.clientHelpers.push({
      clientId,
      userId: helperUserId,
      organizationId: helperUserId ? null : organizationId,
      priority,
    });
  });
  return getClientProfile(buildSession(readDb(), user.id)!, clientId);
}

export function removeHelper(user: SessionUser, clientId: string, body: Record<string, unknown>) {
  const helperUserId = text(body.userId, 80) || null;
  const organizationId = text(body.organizationId, 80) || null;
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const client = clientById(db, clientId);
    assertCan(session, "manage_helpers", resourceForClient(client));
    db.clientHelpers = db.clientHelpers.filter((item) => {
      if (item.clientId !== clientId) return true;
      if (helperUserId) return item.userId !== helperUserId;
      if (organizationId) return item.organizationId !== organizationId;
      return true;
    });
  });
  return getClientProfile(buildSession(readDb(), user.id)!, clientId);
}

export function createIncident(user: SessionUser, clientId: string, body: Record<string, unknown>) {
  const triage = parseTriage(body.triage);
  const emergency = needsEmergency(triage);
  let incidentId = "";
  let status: IncidentStatus = emergency ? "escalated_112" : "open";

  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const client = clientById(db, clientId);
    assertCan(session, "call_help", resourceForClient(client));
    const existing = activeFor(db, clientId);
    if (existing) {
      incidentId = existing.id;
      status = existing.status;
      return;
    }
    incidentId = randomUUID();
    db.incidents.push({
      id: incidentId,
      clientId,
      createdAt: new Date().toISOString(),
      triage,
      status,
      helperUserId: null,
      helperEtaMin: null,
      acceptedAt: null,
      arrivedAt: null,
      resolvedAt: null,
      outcome: null,
      outcomeNote: null,
      kovStatus: "new",
    });
  });

  return { incidentId, status, emergency: status === "escalated_112" };
}

export function cancelIncident(user: SessionUser, incidentId: string) {
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    assertCan(session, "cancel_incident", resourceForIncident(incident, client));
    if (incident.status !== "open" && incident.status !== "helper_on_way") {
      throw new ApiError("Seda kutset ei saa tühistada", 400, "VALIDATION");
    }
    incident.status = "cancelled";
    incident.resolvedAt = new Date().toISOString();
  });
  const incident = incidentById(readDb(), incidentId);
  return getHelpView(buildSession(readDb(), user.id)!, incident.clientId);
}

function cancelNoticeFor(incident: Incident, userId: string) {
  if (incident.status !== "cancelled" || incident.helperUserId !== userId || !incident.resolvedAt) return false;
  return Date.now() - new Date(incident.resolvedAt).getTime() <= CANCEL_NOTICE_MS;
}

function incidentSummary(db: Db, incident: Incident) {
  const client = clientById(db, incident.clientId);
  return {
    id: incident.id,
    clientId: client.id,
    clientName: nameOf(db, client.elderUserId),
    address: client.address,
    municipalityName: municipalityName(db, client.municipalityId),
    createdAt: incident.createdAt,
    status: incident.status,
    helperName: nameOf(db, incident.helperUserId),
    helperEtaMin: incident.helperEtaMin,
    acceptedAt: incident.acceptedAt ?? null,
    arrivedAt: incident.arrivedAt ?? null,
    waitingLong: isWaitingLong(incident),
    waitingTooLong: isWaitingLong(incident),
    outcome: incident.outcome,
    kovStatus: incident.kovStatus,
  };
}

export function getQueue(user: SessionUser) {
  assertCan(user, "view_queue");
  const db = readDb();
  const ids = new Set([...user.helperClientIds, ...user.orgClientIds]);
  return db.incidents
    .filter((item) => ids.has(item.clientId) && (ACTIVE.includes(item.status) || cancelNoticeFor(item, user.id)))
    .sort((a, b) => {
      const late = Number(isWaitingLong(b)) - Number(isWaitingLong(a));
      if (late !== 0) return late;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((item) => incidentSummary(db, item));
}

export function getIncident(user: SessionUser, incidentId: string) {
  const db = readDb();
  const incident = incidentById(db, incidentId);
  const client = clientById(db, incident.clientId);
  const resource = resourceForIncident(incident, client);
  assertCan(user, "view_client", resource);
  const elder = userById(db, client.elderUserId);
  const canAccess = can(user, "view_access", resource);
  return {
    ...incidentSummary(db, incident),
    clientPhone: elder?.phone ?? null,
    accessNotes: canAccess ? client.accessNotes : null,
    canAccept: can(user, "accept_incident", resource),
    canMarkArrived: can(user, "mark_arrived", resource),
    canClose: can(user, "close_incident", resource),
    canAssign: can(user, "assign_helper", resource),
    assignees: can(user, "assign_helper", resource) ? assigneeOptions(db, client.id, user.organizationId) : [],
    outcomeNote: incident.outcomeNote,
    isPro: user.roles.includes("helper_pro"),
  };
}

function assigneeOptions(db: Db, clientId: string, organizationId: string | null) {
  const ids = new Set<string>();
  for (const helper of db.clientHelpers) {
    if (helper.clientId === clientId && helper.userId) ids.add(helper.userId);
  }
  if (organizationId) {
    for (const person of db.users) {
      if (person.organizationId !== organizationId) continue;
      const roles = rolesOf(db, person.id);
      if (roles.includes("helper_pro") || roles.includes("helper_coordinator")) ids.add(person.id);
    }
  }
  return [...ids].map((id) => ({ id, name: nameOf(db, id) })).filter((item) => item.name);
}

export function acceptIncident(user: SessionUser, incidentId: string, body: Record<string, unknown>) {
  const eta = Number(body.etaMin);
  if (!ETA.has(eta)) throw new ApiError("Vali 5, 10, 20 või 40 minutit", 400, "VALIDATION");
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    const resource = resourceForIncident(incident, client);
    if (incident.status !== "open") {
      assertCan(session, "view_client", resource);
      const takenBy = nameOf(db, incident.helperUserId) ?? "keegi";
      throw new ApiError(`Kutse võttis juba vastu ${takenBy}`, 409, "CONFLICT");
    }
    assertCan(session, "accept_incident", resource);
    incident.status = "helper_on_way";
    incident.helperUserId = session.id;
    incident.helperEtaMin = eta;
    incident.acceptedAt = new Date().toISOString();
    incident.arrivedAt = null;
  });
  return getIncident(buildSession(readDb(), user.id)!, incidentId);
}

export function markArrived(user: SessionUser, incidentId: string) {
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    assertCan(session, "mark_arrived", resourceForIncident(incident, client));
    incident.status = "helper_arrived";
    incident.arrivedAt = new Date().toISOString();
  });
  return getIncident(buildSession(readDb(), user.id)!, incidentId);
}

export function closeIncident(user: SessionUser, incidentId: string, body: Record<string, unknown>) {
  const outcome = text(body.outcome, 40);
  if (outcome !== "helped_up" && outcome !== "called_112" && outcome !== "other") {
    throw new ApiError("Vali tulemus", 400, "VALIDATION");
  }
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    assertCan(session, "close_incident", resourceForIncident(incident, client));
    incident.status = "resolved";
    incident.outcome = outcome as Outcome;
    incident.outcomeNote = text(body.outcomeNote, 500) || null;
    incident.resolvedAt = new Date().toISOString();
  });
  return getIncident(buildSession(readDb(), user.id)!, incidentId);
}

export function assignIncident(user: SessionUser, incidentId: string, body: Record<string, unknown>) {
  const helperUserId = text(body.helperUserId, 80);
  const eta = Number(body.etaMin ?? 10);
  if (!ETA.has(eta)) throw new ApiError("Vali 5, 10, 20 või 40 minutit", 400, "VALIDATION");
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    assertCan(session, "assign_helper", resourceForIncident(incident, client));
    const allowed = assigneeOptions(db, client.id, session.organizationId).some((item) => item.id === helperUserId);
    if (!allowed) throw new ApiError("Seda töötajat ei saa määrata", 400, "VALIDATION");
    incident.helperUserId = helperUserId;
    incident.helperEtaMin = eta;
    incident.acceptedAt = new Date().toISOString();
    incident.arrivedAt = null;
    incident.status = "helper_on_way";
  });
  return getIncident(buildSession(readDb(), user.id)!, incidentId);
}

export function getOrg(user: SessionUser) {
  assertCan(user, "view_org");
  const db = readDb();
  const org = db.organizations.find((item) => item.id === user.organizationId);
  const workers = db.users
    .filter((item) => item.organizationId === user.organizationId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      roles: rolesOf(db, item.id),
    }));
  const incidents = db.incidents
    .filter((item) => user.orgClientIds.includes(item.clientId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map((item) => incidentSummary(db, item));
  return { orgName: org?.name ?? "", workers, incidents };
}

function kovClients(db: Db, user: SessionUser) {
  return db.clients.filter((client) => {
    if (!client.kovConsent) return false;
    if (user.roles.includes("admin_system")) return true;
    return client.municipalityId === user.municipalityId;
  });
}

export function getOverview(user: SessionUser) {
  const db = readDb();
  const visible = kovClients(db, user).map((item) => item.id);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return {
    userCount: db.users.length,
    clientCount: db.clients.length,
    openIncidents: db.incidents.filter((item) => ACTIVE.includes(item.status)).length,
    repeatFallers: repeatFallers(db, user).length,
    consentedClients: visible.length,
    recentFalls: db.incidents.filter(
      (item) => visible.includes(item.clientId) && new Date(item.createdAt).getTime() >= since,
    ).length,
    canSystem: user.roles.includes("admin_system"),
    canKov: user.roles.includes("admin_system") || user.roles.includes("admin_kov"),
  };
}

export function listAdminUsers(user: SessionUser) {
  assertCan(user, "admin_system");
  const db = readDb();
  return {
    roles: ROLES,
    users: db.users.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      roles: rolesOf(db, item.id),
      organizationName: orgName(db, item.organizationId),
      municipalityName: item.municipalityId ? municipalityName(db, item.municipalityId) : null,
    })),
  };
}

export function createUser(actor: SessionUser, body: Record<string, unknown>) {
  assertCan(actor, "admin_system");
  const name = text(body.name, 80);
  const phone = text(body.phone, 40) || null;
  const role = text(body.role, 40) as Role;
  if (!name) throw new ApiError("Nimi on kohustuslik", 400, "VALIDATION");
  if (!ROLES.includes(role)) throw new ApiError("Tundmatu roll", 400, "VALIDATION");
  const id = randomUUID();
  updateDb((db) => {
    db.users.push({
      id,
      name,
      phone,
      organizationId: null,
      municipalityId: null,
    });
    db.userRoles.push({ userId: id, role });
  });
  return { id };
}

export function changeRole(actor: SessionUser, userId: string, body: Record<string, unknown>) {
  assertCan(actor, "admin_system");
  const role = text(body.role, 40) as Role;
  const op = text(body.op, 10);
  if (!ROLES.includes(role)) throw new ApiError("Tundmatu roll", 400, "VALIDATION");
  if (op !== "add" && op !== "remove") throw new ApiError("Tundmatu toiming", 400, "VALIDATION");

  updateDb((db) => {
    if (!db.users.some((item) => item.id === userId)) throw new ApiError("Kasutajat ei leitud", 404, "NOT_FOUND");
    if (op === "add") {
      if (!db.userRoles.some((item) => item.userId === userId && item.role === role)) {
        db.userRoles.push({ userId, role });
      }
      return;
    }
    if (role === "admin_system") {
      const admins = db.userRoles.filter((item) => item.role === "admin_system");
      if (admins.length <= 1 && admins.some((item) => item.userId === userId)) {
        throw new ApiError("Viimast süsteemi admini ei saa eemaldada", 400, "VALIDATION");
      }
    }
    const next = db.userRoles.filter((item) => !(item.userId === userId && item.role === role));
    if (!next.some((item) => item.userId === userId)) {
      throw new ApiError("Kasutajal peab jääma vähemalt üks roll", 400, "VALIDATION");
    }
    db.userRoles = next;
  });
  return listAdminUsers(buildSession(readDb(), actor.id)!);
}

export function listAdminClients(user: SessionUser) {
  assertCan(user, "admin_system");
  const db = readDb();
  return db.clients.map((client) => ({
    id: client.id,
    name: nameOf(db, client.elderUserId),
    address: client.address,
    municipalityName: municipalityName(db, client.municipalityId),
    kovConsent: client.kovConsent,
    helpers: db.clientHelpers
      .filter((item) => item.clientId === client.id)
      .map((item) => (item.userId ? nameOf(db, item.userId) : orgName(db, item.organizationId))),
  }));
}

function repeatFallers(db: Db, user: SessionUser) {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const incident of db.incidents) {
    if (new Date(incident.createdAt).getTime() < since) continue;
    counts.set(incident.clientId, (counts.get(incident.clientId) ?? 0) + 1);
  }
  return kovClients(db, user)
    .filter((client) => (counts.get(client.id) ?? 0) >= 2)
    .map((client) => ({
      clientId: client.id,
      name: nameOf(db, client.elderUserId),
      address: client.address,
      municipalityName: municipalityName(db, client.municipalityId),
      falls30d: counts.get(client.id) ?? 0,
    }));
}

export function getKov(user: SessionUser) {
  if (!can(user, "view_kov") && !user.roles.includes("admin_system")) {
    throw new ApiError("Puudub õigus", 403, "FORBIDDEN");
  }
  const db = readDb();
  const allowed = new Set(kovClients(db, user).map((item) => item.id));
  const incidents = db.incidents
    .filter((item) => allowed.has(item.clientId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => incidentSummary(db, item));
  return { repeatFallers: repeatFallers(db, user), incidents };
}

export function markKov(user: SessionUser, incidentId: string, body: Record<string, unknown>) {
  const kovStatus = text(body.kovStatus, 20) as KovStatus;
  if (kovStatus !== "new" && kovStatus !== "in_progress" && kovStatus !== "done") {
    throw new ApiError("Tundmatu olek", 400, "VALIDATION");
  }
  updateDb((db) => {
    const session = buildSession(db, user.id);
    if (!session) throw new ApiError("Vali demokasutaja", 401, "AUTH");
    const incident = incidentById(db, incidentId);
    const client = clientById(db, incident.clientId);
    assertCan(session, "mark_kov", resourceForClient(client));
    incident.kovStatus = kovStatus;
  });
  return { ok: true };
}

export function resetDemo(user: SessionUser) {
  assertCan(user, "admin_system");
  resetDb();
  return { ok: true };
}
