import { describe, expect, it, vi } from "vitest";
import { ID } from "../../backend/ids";
import { acceptIncident, cancelIncident, closeIncident, getQueue, markArrived } from "../../backend/service";
import { as, callAs, callHelp, storedIncident } from "./helpers";

describe("järjekord", () => {
  it("näitab Jürile Helgi kutset", async () => {
    const { incidentId } = await callHelp();
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(true);
  });

  it("näitab Lembiti kutset Liisile ja Peetrile, aga mitte Jürile", async () => {
    const { incidentId } = await callAs(ID.lembit, ID.clientLembit);
    expect((await getQueue(await as(ID.liis))).some((item) => item.id === incidentId)).toBe(true);
    expect((await getQueue(await as(ID.peeter))).some((item) => item.id === incidentId)).toBe(true);
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(false);
  });

  it("ei näita Aino kutset kellelegi, sest seemnes pole tal täitjaid", async () => {
    const { incidentId } = await callAs(ID.aino, ID.clientAino);
    for (const userId of [ID.juri, ID.mari, ID.liis, ID.peeter]) {
      expect((await getQueue(await as(userId))).some((item) => item.id === incidentId)).toBe(false);
    }
  });

  it("eemaldab lõpetatud juhtumi järjekorrast", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await closeIncident(await as(ID.juri), incidentId, { outcome: "helped_up" });
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(false);
  });

  it("näitab tühistatud teel olnud kutset ainult sellele täitjale 30 sekundit", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await cancelIncident(await as(ID.helgi), incidentId);
    const resolvedAt = (await storedIncident(incidentId)).resolvedAt;
    expect(resolvedAt).toBeTruthy();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(resolvedAt!));
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(true);
    expect((await getQueue(await as(ID.mari))).some((item) => item.id === incidentId)).toBe(false);

    vi.setSystemTime(new Date(new Date(resolvedAt!).getTime() + 30_001));
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(false);
  });

  it("näitab Marile, et Jüri on teel", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    const card = (await getQueue(await as(ID.mari))).find((item) => item.id === incidentId);
    expect(card?.status).toBe("helper_on_way");
    expect(card?.helperName).toBe("Jüri Mets");
  });
});

describe("kohale jõudmine ei jää järjekorda võõrana", () => {
  it("jätab saabunud juhtumi määratud täitja järjekorda", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 5 });
    await markArrived(await as(ID.juri), incidentId);
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId && item.status === "helper_arrived")).toBe(
      true,
    );
  });
});
