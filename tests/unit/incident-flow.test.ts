import { describe, expect, it } from "vitest";
import { ID } from "../../backend/ids";
import {
  acceptIncident,
  assignIncident,
  cancelIncident,
  closeIncident,
  createIncident,
  getQueue,
  markArrived,
  resetDemo,
} from "../../backend/service";
import { readDb } from "../../backend/store";
import { as, callAs, callHelp, expectApiError, storedIncident } from "./helpers";

describe("kutse loomine", () => {
  it("loob tavalise kutse olekus open", () => {
    const created = callHelp();
    expect(created.status).toBe("open");
    expect(created.emergency).toBe(false);
    expect(storedIncident(created.incidentId).createdAt).toBeTruthy();
  });

  it("saadab vastamata triaaži korral 112-le", () => {
    const created = createIncident(as(ID.helgi), ID.clientHelgi, {});
    expect(created.status).toBe("escalated_112");
    expect(created.emergency).toBe(true);
  });

  it("ei loo teist aktiivset kutset", () => {
    const first = callHelp();
    const createdAt = storedIncident(first.incidentId).createdAt;
    const second = callHelp();
    expect(second.incidentId).toBe(first.incidentId);
    expect(storedIncident(first.incidentId).createdAt).toBe(createdAt);
  });
});

describe("vastuvõtt", () => {
  it.each([5, 10, 20, 40])("võtab kutse vastu %i minutiga", (etaMin) => {
    const { incidentId } = callHelp();
    const view = acceptIncident(as(ID.juri), incidentId, { etaMin });
    expect(view.status).toBe("helper_on_way");
    const stored = storedIncident(incidentId);
    expect(stored.helperUserId).toBe(ID.juri);
    expect(stored.acceptedAt).toBeTruthy();
    expect(stored.helperEtaMin).toBe(etaMin);
  });

  it.each([0, 7, "abc"])("keeldub saabumisajast %s", (etaMin) => {
    const { incidentId } = callHelp();
    expectApiError(() => acceptIncident(as(ID.juri), incidentId, { etaMin }), 400);
  });

  it("annab teisele täitjale vea 409 ja jätab esimese täitja", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    const error = expectApiError(() => acceptIncident(as(ID.mari), incidentId, { etaMin: 10 }), 409);
    expect(error.message).toContain("Jüri");
    expect(storedIncident(incidentId).helperUserId).toBe(ID.juri);
  });

  it("keelab Jüril Lembiti kutse vastu võtta", () => {
    const { incidentId } = callAs(ID.lembit, ID.clientLembit);
    expectApiError(() => acceptIncident(as(ID.juri), incidentId, { etaMin: 10 }), 403);
  });
});

describe("kohale jõudmine", () => {
  it("märgib täitja kohale ja keeldub teisest korrast", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    const arrived = markArrived(as(ID.juri), incidentId);
    expect(arrived.status).toBe("helper_arrived");
    expect(storedIncident(incidentId).arrivedAt).toBeTruthy();
    expectApiError(() => markArrived(as(ID.juri), incidentId), 403);
  });
});

describe("sulgemine", () => {
  it.each(["helped_up", "called_112", "other"] as const)("salvestab tulemuse %s", (outcome) => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    markArrived(as(ID.juri), incidentId);
    const closed = closeIncident(as(ID.juri), incidentId, { outcome });
    expect(closed.status).toBe("resolved");
    expect(storedIncident(incidentId).resolvedAt).toBeTruthy();
    expect(storedIncident(incidentId).outcome).toBe(outcome);
  });

  it.each(["helper_on_way", "helper_arrived"] as const)("laseb sulgeda olekust %s", (status) => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    if (status === "helper_arrived") markArrived(as(ID.juri), incidentId);
    expect(closeIncident(as(ID.juri), incidentId, { outcome: "helped_up" }).status).toBe("resolved");
  });

  it("keeldub tundmatust tulemusest", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    expectApiError(() => closeIncident(as(ID.juri), incidentId, { outcome: "vale" }), 400);
  });

  it("lühendab märkuse 500 märgini", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    closeIncident(as(ID.juri), incidentId, { outcome: "other", outcomeNote: "a".repeat(600) });
    expect(storedIncident(incidentId).outcomeNote).toHaveLength(500);
  });

  it("keelab Maril sulgeda Jüri juhtumit", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    expectApiError(() => closeIncident(as(ID.mari), incidentId, { outcome: "helped_up" }), 403);
  });
});

describe("tühistamine", () => {
  it("laseb Helgil tühistada avatud kutse", () => {
    const { incidentId } = callHelp();
    cancelIncident(as(ID.helgi), incidentId);
    expect(storedIncident(incidentId).status).toBe("cancelled");
  });

  it("laseb Helgil tühistada kutse, kui täitja on teel", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    cancelIncident(as(ID.helgi), incidentId);
    expect(storedIncident(incidentId).status).toBe("cancelled");
  });

  it("keeldub tühistamisest, kui täitja on kohal (403, õiguse kontroll tuleb enne 400 teadet)", () => {
    const { incidentId } = callHelp();
    acceptIncident(as(ID.juri), incidentId, { etaMin: 10 });
    markArrived(as(ID.juri), incidentId);
    expectApiError(() => cancelIncident(as(ID.helgi), incidentId), 403);
  });

  it("keelab Maril kutset tühistada", () => {
    const { incidentId } = callHelp();
    expectApiError(() => cancelIncident(as(ID.mari), incidentId), 403);
  });
});

describe("pärast lõpetamist", () => {
  it("laseb Helgil teha uue kutse", () => {
    const first = callHelp();
    const firstCreatedAt = storedIncident(first.incidentId).createdAt;
    acceptIncident(as(ID.juri), first.incidentId, { etaMin: 10 });
    closeIncident(as(ID.juri), first.incidentId, { outcome: "helped_up" });
    const second = callHelp();
    expect(second.incidentId).not.toBe(first.incidentId);
    expect(storedIncident(second.incidentId).createdAt).not.toBe(firstCreatedAt);
  });
});

describe("koordinaator", () => {
  it("laseb Peetril määrata Liisi", () => {
    const { incidentId } = callHelp();
    const view = assignIncident(as(ID.peeter), incidentId, { helperUserId: ID.liis, etaMin: 10 });
    expect(view.status).toBe("helper_on_way");
    expect(storedIncident(incidentId).helperUserId).toBe(ID.liis);
  });

  // assignIncident treats every personally linked helper as assignable, so a
  // coordinator can send Jüri even though he is not an organization employee.
  it.fails("keeldub Jüri määramisest, sest ta ei ole organisatsiooni töötaja", () => {
    const { incidentId } = callHelp();
    expectApiError(() => assignIncident(as(ID.peeter), incidentId, { helperUserId: ID.juri, etaMin: 10 }), 400);
  });
});

describe("demo lähtestamine", () => {
  it("eemaldab Anna lähtestamisel aktiivsed juhtumid", () => {
    const { incidentId } = callHelp();
    resetDemo(as(ID.anna));
    expect(getQueue(as(ID.juri)).some((item) => item.id === incidentId)).toBe(false);
    const active = ["open", "escalated_112", "helper_on_way", "helper_arrived"];
    expect(readDb().incidents.some((item) => active.includes(item.status))).toBe(false);
  });

  it("keelab Jüril demot lähtestada", () => {
    expectApiError(() => resetDemo(as(ID.juri)), 403);
  });
});
