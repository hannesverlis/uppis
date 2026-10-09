import { expect } from "vitest";
import { ApiError } from "../../backend/errors";
import { ID } from "../../backend/ids";
import { buildSession } from "../../backend/session";
import { createIncident } from "../../backend/service";
import { readDb } from "../../backend/store";
import { CLEAR_TRIAGE } from "../../backend/triage";
import type { Incident, SessionUser } from "../../backend/types";

export { CLEAR_TRIAGE };

export function as(userId: string): SessionUser {
  const user = buildSession(readDb(), userId);
  if (!user) throw new Error(`Demo user ${userId} is missing from the seed`);
  return user;
}

export function callAs(userId: string, clientId: string) {
  return createIncident(as(userId), clientId, { triage: CLEAR_TRIAGE });
}

export function callHelp(clientId = ID.clientHelgi) {
  return callAs(ID.helgi, clientId);
}

export function storedIncident(incidentId: string): Incident {
  const incident = readDb().incidents.find((item) => item.id === incidentId);
  if (!incident) throw new Error(`Incident ${incidentId} was not stored`);
  return incident;
}

export function expectApiError(fn: () => unknown, status: number) {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).status).toBe(status);
  return caught as ApiError;
}
