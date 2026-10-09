import { describe, expect, it, vi } from "vitest";
import { ID } from "../../backend/ids";
import { acceptIncident, getQueue } from "../../backend/service";
import { updateDb } from "../../backend/store";
import { emptyTriage } from "../../backend/triage";
import type { Incident } from "../../backend/types";
import { as, callHelp } from "./helpers";

const START = new Date("2026-10-09T12:00:00.000Z");

function openIncident(id: string, createdAt: string): Incident {
  return {
    id,
    clientId: ID.clientHelgi,
    createdAt,
    triage: emptyTriage(),
    status: "open",
    helperUserId: null,
    helperEtaMin: null,
    acceptedAt: null,
    arrivedAt: null,
    resolvedAt: null,
    outcome: null,
    outcomeNote: null,
    kovStatus: "new",
  };
}

describe("ootamise kell", () => {
  it("märgib üle 10 minuti oodanud avatud kutse", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { incidentId } = await callHelp();

    vi.setSystemTime(new Date(START.getTime() + 9 * 60_000 + 59_000));
    expect((await getQueue(await as(ID.juri))).find((item) => item.id === incidentId)?.waitingTooLong).toBe(false);

    vi.setSystemTime(new Date(START.getTime() + 10 * 60_000 + 1_000));
    expect((await getQueue(await as(ID.juri))).find((item) => item.id === incidentId)?.waitingTooLong).toBe(true);
  });

  it("ei märgi hilinemist, kui täitja on juba teel", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    vi.setSystemTime(new Date(START.getTime() + 30 * 60_000));
    expect((await getQueue(await as(ID.juri))).find((item) => item.id === incidentId)?.waitingTooLong).toBe(false);
  });

  it("tõstab kaua oodanud kutse järjekorras ette", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const older = "50000000-0000-4000-8000-000000000091";
    const newer = "50000000-0000-4000-8000-000000000092";
    await updateDb((db) => {
      db.incidents.push(
        openIncident(older, new Date(START.getTime() - 11 * 60_000).toISOString()),
        openIncident(newer, START.toISOString()),
      );
    });
    const ids = (await getQueue(await as(ID.juri)))
      .map((item) => item.id)
      .filter((id) => id === older || id === newer);
    expect(ids).toEqual([older, newer]);
  });
});
