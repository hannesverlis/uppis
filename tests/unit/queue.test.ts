import { describe, expect, it, vi } from "vitest";
import { ID } from "../../backend/ids";
import { acceptIncident, cancelIncident, closeIncident, getQueue, markArrived } from "../../backend/service";
import { as, callAs, callHelp, storedIncident } from "./helpers";

describe("järjekord", () => {
  it("näitab Jürile Helgi kutset", () => {
    const { incidentId } = callHelp();
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(true);
  });

  it("näitab Lembiti kutset Liisile ja Peetrile, aga mitte Jürile", () => {
    const { incidentId } = callAs(ID.lembit, ID.clientLembit);
    expect(getQueue(as(ID.liis)).some((item) => item.id === incidentId)).toBe(true);
    expect(getQueue(as(ID.peeter)).some((item) => item.id === incidentId)).toBe(true);
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(false);
  });

  it("ei näita Aino kutset kellelegi, sest seemnes pole tal täitjaid", () => {
    const { incidentId } = callAs(ID.aino, ID.clientAino);
    for (const userId of [ID.juri, ID.mari, ID.liis, ID.peeter]) {
      expect(getQueue(as(userId)).some((item) => item.id === incidentId)).toBe(false);
    }
  });

  it("eemaldab lõpetatud juhtumi järjekorrast", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    closeIncident(as(ID.juri), incidentId, { outcome: "helped_up" });
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(false);
  });

  it("näitab tühistatud teel olnud kutset ainult sellele täitjale 30 sekundit", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    cancelIncident(as(ID.helgi), incidentId);
    const resolvedAt = storedIncident(incidentId).resolvedAt;
    expect(resolvedAt).toBeTruthy();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(resolvedAt!));
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(true);
    expect(getQueue(as(ID.mari)).some((item) => item.id === incidentId)).toBe(false);

    vi.setSystemTime(new Date(new Date(resolvedAt!).getTime() + 30_001));
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(false);
  });

  it("näitab Marile, et Jüri on teel", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    const card = getQueue(as(ID.mari)).find((item) => item.id === incidentId);
    expect(card?.status).toBe("helper_on_way");
    expect(card?.helperName).toBe("Jüri Mets");
  });
});

describe("kohale jõudmine ei jää järjekorda võõrana", () => {
  it("jätab saabunud juhtumi määratud täitja järjekorda", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 5 });
    markArrived(as(ID.juri), incidentId);
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId && item.status === "helper_arrived")).toBe(
      true,
    );
  });
});
