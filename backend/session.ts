import type { Db, SessionUser } from "./types";

export function buildSession(db: Db, userId: string): SessionUser | null {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return null;

  const roles = db.userRoles.filter((item) => item.userId === userId).map((item) => item.role);
  const elderClientIds = db.clients.filter((item) => item.elderUserId === userId).map((item) => item.id);
  const contactClientIds = db.clientContacts
    .filter((item) => item.userId === userId)
    .map((item) => item.clientId);
  const helperClientIds = db.clientHelpers
    .filter((item) => item.userId === userId)
    .map((item) => item.clientId);
  const orgClientIds = user.organizationId
    ? db.clientHelpers
        .filter((item) => item.organizationId === user.organizationId)
        .map((item) => item.clientId)
    : [];

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    organizationId: user.organizationId,
    municipalityId: user.municipalityId,
    roles,
    elderClientIds,
    contactClientIds,
    helperClientIds,
    orgClientIds,
  };
}

export function homeFor(user: SessionUser): string {
  const clientRoles = user.roles.filter((role) => role.startsWith("client_"));
  const helperRoles = user.roles.filter((role) => role.startsWith("helper_"));
  const adminRoles = user.roles.filter((role) => role.startsWith("admin_"));
  const onlyElder =
    user.roles.length === 1 && user.roles[0] === "client_elder" && user.elderClientIds[0];

  if (onlyElder) return `/kliendid/${user.elderClientIds[0]}/abi`;
  if (user.roles.includes("helper_coordinator") && clientRoles.length === 0 && adminRoles.length === 0) {
    return "/taitjad/organisatsioon";
  }
  if (helperRoles.length > 0 && clientRoles.length === 0 && adminRoles.length === 0) return "/taitjad";
  if (adminRoles.length > 0 && clientRoles.length === 0 && helperRoles.length === 0) return "/admin";
  if (clientRoles.length > 0) return "/kliendid";
  if (helperRoles.length > 0) return "/taitjad";
  if (adminRoles.length > 0) return "/admin";
  return "/";
}
