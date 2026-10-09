import type { Action, PermissionResource, Role, SessionUser } from "./types";

const HELPER_ROLES: Role[] = [
  "helper_volunteer",
  "helper_relative",
  "helper_pro",
  "helper_coordinator",
];

function has(user: SessionUser, role: Role) {
  return user.roles.includes(role);
}

function hasAny(user: SessionUser, roles: Role[]) {
  return roles.some((role) => user.roles.includes(role));
}

function isElder(user: SessionUser, clientId: string) {
  return user.elderClientIds.includes(clientId);
}

function isContact(user: SessionUser, clientId: string) {
  return user.contactClientIds.includes(clientId);
}

function isHelper(user: SessionUser, clientId: string) {
  return user.helperClientIds.includes(clientId) || user.orgClientIds.includes(clientId);
}

export function can(user: SessionUser, action: Action, resource: PermissionResource = {}): boolean {
  if (has(user, "admin_system")) return true;

  const clientId = resource.incident?.clientId ?? resource.clientId;

  switch (action) {
    case "admin_system":
      return false;
    case "call_help":
      return !!clientId && has(user, "client_elder") && isElder(user, clientId);
    case "view_client":
      if (!clientId) return false;
      if (isElder(user, clientId) || isContact(user, clientId) || isHelper(user, clientId)) return true;
      return (
        has(user, "admin_kov") &&
        resource.kovConsent === true &&
        !!user.municipalityId &&
        resource.municipalityId === user.municipalityId
      );
    case "edit_client":
    case "manage_helpers":
      return (
        !!clientId &&
        isContact(user, clientId) &&
        (has(user, "client_relative") || has(user, "client_guardian"))
      );
    case "set_kov_consent":
      return !!clientId && isContact(user, clientId) && has(user, "client_guardian");
    case "view_access":
      if (!clientId) return false;
      if (isContact(user, clientId) && (has(user, "client_relative") || has(user, "client_guardian"))) {
        return true;
      }
      if (
        resource.incident &&
        resource.incident.helperUserId === user.id &&
        (resource.incident.status === "helper_on_way" ||
          resource.incident.status === "helper_arrived" ||
          resource.incident.status === "resolved")
      ) {
        return true;
      }
      return has(user, "helper_coordinator") && user.orgClientIds.includes(clientId);
    case "view_queue":
      return hasAny(user, HELPER_ROLES);
    case "accept_incident":
      return (
        !!resource.incident &&
        resource.incident.status === "open" &&
        isHelper(user, resource.incident.clientId) &&
        hasAny(user, HELPER_ROLES)
      );
    case "mark_arrived":
      if (!resource.incident || resource.incident.status !== "helper_on_way") return false;
      if (resource.incident.helperUserId === user.id) return true;
      return has(user, "helper_coordinator") && user.orgClientIds.includes(resource.incident.clientId);
    case "close_incident":
      if (
        !resource.incident ||
        (resource.incident.status !== "helper_on_way" && resource.incident.status !== "helper_arrived")
      ) {
        return false;
      }
      if (resource.incident.helperUserId === user.id) return true;
      return has(user, "helper_coordinator") && user.orgClientIds.includes(resource.incident.clientId);
    case "view_org":
      return has(user, "helper_coordinator") && !!user.organizationId;
    case "assign_helper":
      return (
        !!resource.incident &&
        (resource.incident.status === "open" || resource.incident.status === "helper_on_way") &&
        has(user, "helper_coordinator") &&
        !!user.organizationId &&
        user.orgClientIds.includes(resource.incident.clientId)
      );
    case "view_kov":
      return has(user, "admin_kov") && !!user.municipalityId;
    case "mark_kov":
      return (
        has(user, "admin_kov") &&
        resource.kovConsent === true &&
        !!user.municipalityId &&
        resource.municipalityId === user.municipalityId
      );
    default:
      return false;
  }
}
