import { expect } from "vitest";
import { ApiError } from "../../backend/errors";
import { ID } from "../../backend/ids";
import { buildSession } from "../../backend/session";
import { createIncident } from "../../backend/service";
import { readDb } from "../../backend/store";
import { CLEAR_TRIAGE } from "../../backend/triage";
import type { Incident, SessionUser } from "../../backend/types";

export { CLEAR_TRIAGE };

export async function as(userId: string): Promise<SessionUser> {
  const user = buildSession(await readDb(), userId);
  if (!user) throw new Error(`Demo user ${userId} is missing from the seed`);
  return user;
}

export async function callAs(userId: string, clientId: string) {
  return createIncident(await as(userId), clientId, { triage: CLEAR_TRIAGE });
}

export async function callHelp(clientId = ID.clientHelgi) {
  return callAs(ID.helgi, clientId);
}

export async function storedIncident(incidentId: string): Promise<Incident> {
  const incident = (await readDb()).incidents.find((item) => item.id === incidentId);
  if (!incident) throw new Error(`Incident ${incidentId} was not stored`);
  return incident;
}

export async function expectApiError(fn: () => unknown, status: number) {
  let caught: unknown;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).status).toBe(status);
  return caught as ApiError;
}
