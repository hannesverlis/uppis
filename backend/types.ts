export const ROLES = [
  "client_elder",
  "client_relative",
  "client_guardian",
  "helper_volunteer",
  "helper_relative",
  "helper_pro",
  "helper_coordinator",
  "admin_system",
  "admin_kov",
] as const;

export type Role = (typeof ROLES)[number];

export type IncidentStatus =
  | "open"
  | "escalated_112"
  | "helper_on_way"
  | "helper_arrived"
  | "resolved"
  | "cancelled";

export type Outcome = "helped_up" | "called_112" | "other";

export type KovStatus = "new" | "in_progress" | "done";

export type TriageAnswers = {
  hitHead: boolean | null;
  severePainOrCantMove: boolean | null;
  bleeding: boolean | null;
  breathingOrChestPain: boolean | null;
  onFloorOverHour: boolean | null;
};

export type Municipality = {
  id: string;
  name: string;
};

export type Organization = {
  id: string;
  name: string;
  municipalityId: string;
};

export type User = {
  id: string;
  name: string;
  phone: string | null;
  organizationId: string | null;
  municipalityId: string | null;
};

export type UserRole = {
  userId: string;
  role: Role;
};

export type Client = {
  id: string;
  elderUserId: string;
  address: string;
  municipalityId: string;
  accessNotes: string;
  kovConsent: boolean;
};

export type ClientContact = {
  clientId: string;
  userId: string;
  relation: string;
};

export type ClientHelper = {
  clientId: string;
  userId: string | null;
  organizationId: string | null;
  priority: number;
};

export type Incident = {
  id: string;
  clientId: string;
  createdAt: string;
  triage: TriageAnswers;
  status: IncidentStatus;
  helperUserId: string | null;
  helperEtaMin: number | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  resolvedAt: string | null;
  outcome: Outcome | null;
  outcomeNote: string | null;
  kovStatus: KovStatus;
};

export type Db = {
  municipalities: Municipality[];
  organizations: Organization[];
  users: User[];
  userRoles: UserRole[];
  clients: Client[];
  clientContacts: ClientContact[];
  clientHelpers: ClientHelper[];
  incidents: Incident[];
};

export type SessionUser = {
  id: string;
  name: string;
  phone: string | null;
  organizationId: string | null;
  municipalityId: string | null;
  roles: Role[];
  elderClientIds: string[];
  contactClientIds: string[];
  helperClientIds: string[];
  orgClientIds: string[];
};

export type PermissionResource = {
  clientId?: string;
  municipalityId?: string;
  kovConsent?: boolean;
  incident?: {
    clientId: string;
    status: IncidentStatus;
    helperUserId: string | null;
  };
};

export type Action =
  | "call_help"
  | "view_client"
  | "edit_client"
  | "manage_helpers"
  | "set_kov_consent"
  | "view_access"
  | "view_queue"
  | "accept_incident"
  | "mark_arrived"
  | "close_incident"
  | "view_org"
  | "assign_helper"
  | "admin_system"
  | "view_kov"
  | "mark_kov";
