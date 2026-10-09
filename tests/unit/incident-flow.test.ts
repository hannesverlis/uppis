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
  it("loob tavalise kutse olekus open", async () => {
    const created = await callHelp();
    expect(created.status).toBe("open");
    expect(created.emergency).toBe(false);
    expect((await storedIncident(created.incidentId)).createdAt).toBeTruthy();
  });

  it("saadab vastamata triaaži korral 112-le", async () => {
    const created = await createIncident(await as(ID.helgi), ID.clientHelgi, {});
    expect(created.status).toBe("escalated_112");
    expect(created.emergency).toBe(true);
  });

  it("ei loo teist aktiivset kutset", async () => {
    const first = await callHelp();
    const createdAt = (await storedIncident(first.incidentId)).createdAt;
    const second = await callHelp();
    expect(second.incidentId).toBe(first.incidentId);
    expect((await storedIncident(first.incidentId)).createdAt).toBe(createdAt);
  });
});

describe("vastuvõtt", () => {
  it.each([5, 10, 20, 40])("võtab kutse vastu %i minutiga", async (etaMin) => {
    const { incidentId } = await callHelp();
    const view = await acceptIncident(await as(ID.juri), incidentId, { etaMin });
    expect(view.status).toBe("helper_on_way");
    const stored = await storedIncident(incidentId);
    expect(stored.helperUserId).toBe(ID.juri);
    expect(stored.acceptedAt).toBeTruthy();
    expect(stored.helperEtaMin).toBe(etaMin);
  });

  it.each([0, 7, "abc"])("keeldub saabumisajast %s", async (etaMin) => {
    const { incidentId } = await callHelp();
    await expectApiError(async () => await acceptIncident(await as(ID.juri), incidentId, { etaMin }), 400);
  });

  it("annab teisele täitjale vea 409 ja jätab esimese täitja", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    const error = await expectApiError(async () => await acceptIncident(await as(ID.mari), incidentId, { etaMin: 10 }), 409);
    expect(error.message).toContain("Jüri");
    expect((await storedIncident(incidentId)).helperUserId).toBe(ID.juri);
  });

  it("keelab Jüril Lembiti kutse vastu võtta", async () => {
    const { incidentId } = await callAs(ID.lembit, ID.clientLembit);
    await expectApiError(async () => await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 }), 403);
  });
});

describe("kohale jõudmine", () => {
  it("märgib täitja kohale ja keeldub teisest korrast", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    const arrived = await markArrived(await as(ID.juri), incidentId);
    expect(arrived.status).toBe("helper_arrived");
    expect((await storedIncident(incidentId)).arrivedAt).toBeTruthy();
    await expectApiError(async () => await markArrived(await as(ID.juri), incidentId), 403);
  });
});

describe("sulgemine", () => {
  it.each(["helped_up", "called_112", "other"] as const)("salvestab tulemuse %s", async (outcome) => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await markArrived(await as(ID.juri), incidentId);
    const closed = await closeIncident(await as(ID.juri), incidentId, { outcome });
    expect(closed.status).toBe("resolved");
    expect((await storedIncident(incidentId)).resolvedAt).toBeTruthy();
    expect((await storedIncident(incidentId)).outcome).toBe(outcome);
  });

  it.each(["helper_on_way", "helper_arrived"] as const)("laseb sulgeda olekust %s", async (status) => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    if (status === "helper_arrived") await markArrived(await as(ID.juri), incidentId);
    expect((await closeIncident(await as(ID.juri), incidentId, { outcome: "helped_up" })).status).toBe("resolved");
  });

  it("keeldub tundmatust tulemusest", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await expectApiError(async () => await closeIncident(await as(ID.juri), incidentId, { outcome: "vale" }), 400);
  });

  it("lühendab märkuse 500 märgini", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await closeIncident(await as(ID.juri), incidentId, { outcome: "other", outcomeNote: "a".repeat(600) });
    expect((await storedIncident(incidentId)).outcomeNote).toHaveLength(500);
  });

  it("keelab Maril sulgeda Jüri juhtumit", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await expectApiError(async () => await closeIncident(await as(ID.mari), incidentId, { outcome: "helped_up" }), 403);
  });
});

describe("tühistamine", () => {
  it("laseb Helgil tühistada avatud kutse", async () => {
    const { incidentId } = await callHelp();
    await cancelIncident(await as(ID.helgi), incidentId);
    expect((await storedIncident(incidentId)).status).toBe("cancelled");
  });

  it("laseb Helgil tühistada kutse, kui täitja on teel", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await cancelIncident(await as(ID.helgi), incidentId);
    expect((await storedIncident(incidentId)).status).toBe("cancelled");
  });

  it("keeldub tühistamisest, kui täitja on kohal (403, õiguse kontroll tuleb enne 400 teadet)", async () => {
    const { incidentId } = await callHelp();
    await acceptIncident(await as(ID.juri), incidentId, { etaMin: 10 });
    await markArrived(await as(ID.juri), incidentId);
    await expectApiError(async () => await cancelIncident(await as(ID.helgi), incidentId), 403);
  });

  it("keelab Maril kutset tühistada", async () => {
    const { incidentId } = await callHelp();
    await expectApiError(async () => await cancelIncident(await as(ID.mari), incidentId), 403);
  });
});

describe("pärast lõpetamist", () => {
  it("laseb Helgil teha uue kutse", async () => {
    const first = await callHelp();
    const firstCreatedAt = (await storedIncident(first.incidentId)).createdAt;
    await acceptIncident(await as(ID.juri), first.incidentId, { etaMin: 10 });
    await closeIncident(await as(ID.juri), first.incidentId, { outcome: "helped_up" });
    const second = await callHelp();
    expect(second.incidentId).not.toBe(first.incidentId);
    expect((await storedIncident(second.incidentId)).createdAt).not.toBe(firstCreatedAt);
  });
});

describe("koordinaator", () => {
  it("laseb Peetril määrata Liisi", async () => {
    const { incidentId } = await callHelp();
    const view = await assignIncident(await as(ID.peeter), incidentId, { helperUserId: ID.liis, etaMin: 10 });
    expect(view.status).toBe("helper_on_way");
    expect((await storedIncident(incidentId)).helperUserId).toBe(ID.liis);
  });

  it("keeldub Jüri määramisest, sest ta ei ole organisatsiooni töötaja", async () => {
    const { incidentId } = await callHelp();
    await expectApiError(async () => await assignIncident(await as(ID.peeter), incidentId, { helperUserId: ID.juri, etaMin: 10 }), 400);
  });
});

describe("demo lähtestamine", () => {
  it("eemaldab Anna lähtestamisel aktiivsed juhtumid", async () => {
    const { incidentId } = await callHelp();
    await resetDemo(await as(ID.anna));
    expect((await getQueue(await as(ID.juri))).some((item) => item.id === incidentId)).toBe(false);
    const active = ["open", "escalated_112", "helper_on_way", "helper_arrived"];
    expect((await readDb()).incidents.some((item) => active.includes(item.status))).toBe(false);
  });

  it("keelab Jüril demot lähtestada", async () => {
    await expectApiError(async () => await resetDemo(await as(ID.juri)), 403);
  });
});
