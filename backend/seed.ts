import { ID } from "./ids";
import type { Db, Incident, TriageAnswers } from "./types";

const clear: TriageAnswers = {
  hitHead: false,
  severePainOrCantMove: false,
  bleeding: false,
  breathingOrChestPain: false,
  onFloorOverHour: false,
};

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function pastIncident(
  id: string,
  clientId: string,
  days: number,
  helperUserId: string | null,
): Incident {
  return {
    id,
    clientId,
    createdAt: daysAgo(days),
    triage: clear,
    status: "resolved",
    helperUserId,
    helperEtaMin: helperUserId ? 10 : null,
    acceptedAt: helperUserId ? daysAgo(days) : null,
    arrivedAt: null,
    resolvedAt: daysAgo(days - 0.02),
    outcome: "helped_up",
    outcomeNote: null,
    kovStatus: "new",
  };
}

export function createSeed(): Db {
  return {
    municipalities: [
      { id: ID.tallinn, name: "Tallinn" },
      { id: ID.narva, name: "Narva linn" },
      { id: ID.parnu, name: "Pärnu" },
    ],
    organizations: [
      { id: ID.org, name: "Sotsiaalvalve OÜ", municipalityId: ID.tallinn },
    ],
    users: [
      { id: ID.helgi, name: "Helgi Tamm", phone: "5123 1001", organizationId: null, municipalityId: null },
      { id: ID.mari, name: "Mari Tamm", phone: "5123 1002", organizationId: null, municipalityId: null },
      { id: ID.kalle, name: "Kalle Saar", phone: "5123 1003", organizationId: null, municipalityId: null },
      { id: ID.juri, name: "Jüri Mets", phone: "5123 1004", organizationId: null, municipalityId: null },
      { id: ID.liis, name: "Liis Kask", phone: "5123 1005", organizationId: ID.org, municipalityId: null },
      { id: ID.peeter, name: "Peeter Org", phone: "5123 1006", organizationId: ID.org, municipalityId: null },
      { id: ID.anna, name: "Anna Admin", phone: "5123 1007", organizationId: null, municipalityId: null },
      { id: ID.eva, name: "Eva KOV", phone: "5123 1008", organizationId: null, municipalityId: ID.tallinn },
      { id: ID.aino, name: "Aino Levin", phone: "5123 1009", organizationId: null, municipalityId: null },
      { id: ID.lembit, name: "Lembit Kask", phone: "5123 1010", organizationId: null, municipalityId: null },
    ],
    userRoles: [
      { userId: ID.helgi, role: "client_elder" },
      { userId: ID.mari, role: "client_relative" },
      { userId: ID.mari, role: "helper_relative" },
      { userId: ID.kalle, role: "client_guardian" },
      { userId: ID.juri, role: "helper_volunteer" },
      { userId: ID.liis, role: "helper_pro" },
      { userId: ID.peeter, role: "helper_coordinator" },
      { userId: ID.anna, role: "admin_system" },
      { userId: ID.eva, role: "admin_kov" },
      { userId: ID.aino, role: "client_elder" },
      { userId: ID.lembit, role: "client_elder" },
    ],
    clients: [
      {
        id: ID.clientHelgi,
        elderUserId: ID.helgi,
        address: "Pae 12-34, Tallinn",
        municipalityId: ID.tallinn,
        accessNotes: "Trepikoda B, 2. uks paremal. Võti on naabri Jüri juures, korter 33.",
        kovConsent: true,
      },
      {
        id: ID.clientLembit,
        elderUserId: ID.lembit,
        address: "Sõle 8-2, Tallinn",
        municipalityId: ID.tallinn,
        accessNotes: "Uksekood #4521. Lift on olemas.",
        kovConsent: false,
      },
      {
        id: ID.clientAino,
        elderUserId: ID.aino,
        address: "Puškini 4-15, Narva",
        municipalityId: ID.narva,
        accessNotes: "Võti on sotsiaalvalve kontoris.",
        kovConsent: true,
      },
    ],
    clientContacts: [
      { clientId: ID.clientHelgi, userId: ID.mari, relation: "tütar" },
      { clientId: ID.clientHelgi, userId: ID.kalle, relation: "eestkostja" },
      { clientId: ID.clientLembit, userId: ID.kalle, relation: "eestkostja" },
    ],
    clientHelpers: [
      { clientId: ID.clientHelgi, userId: ID.juri, organizationId: null, priority: 1 },
      { clientId: ID.clientHelgi, userId: ID.mari, organizationId: null, priority: 2 },
      { clientId: ID.clientHelgi, userId: null, organizationId: ID.org, priority: 3 },
      { clientId: ID.clientLembit, userId: null, organizationId: ID.org, priority: 1 },
    ],
    incidents: [
      pastIncident("50000000-0000-4000-8000-000000000001", ID.clientHelgi, 8, ID.juri),
      pastIncident("50000000-0000-4000-8000-000000000002", ID.clientLembit, 6, ID.liis),
      pastIncident("50000000-0000-4000-8000-000000000003", ID.clientLembit, 2, ID.liis),
      pastIncident("50000000-0000-4000-8000-000000000004", ID.clientAino, 12, null),
      pastIncident("50000000-0000-4000-8000-000000000005", ID.clientAino, 3, null),
    ],
  };
}
