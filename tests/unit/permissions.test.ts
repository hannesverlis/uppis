import { describe, expect, it } from "vitest";
import { ID } from "../../backend/ids";
import { can } from "../../backend/permissions";
import type { Action, IncidentStatus } from "../../backend/types";
import { as } from "./helpers";

function incident(clientId: string, status: IncidentStatus, helperUserId: string | null = null) {
  return { clientId, status, helperUserId };
}

const helgiOpen = incident(ID.clientHelgi, "open");
const lembitOpen = incident(ID.clientLembit, "open");

describe("call_help", () => {
  it("lubab Helgil kutsuda enda juures", async () => {
    expect(can(await as(ID.helgi), "call_help", { clientId: ID.clientHelgi })).toBe(true);
  });

  it("keelab Helgil kutsuda Lembiti juures", async () => {
    expect(can(await as(ID.helgi), "call_help", { clientId: ID.clientLembit })).toBe(false);
  });

  it.each([
    ["Mari", ID.mari],
    ["Jüri", ID.juri],
    ["Kalle", ID.kalle],
  ])("keelab kutsumise kasutajale %s", async (_name, userId) => {
    expect(can(await as(userId), "call_help", { clientId: ID.clientHelgi })).toBe(false);
  });
});

describe("cancel_incident", () => {
  it.each(["open", "helper_on_way"] as const)("lubab Helgil tühistada olekus %s", async (status) => {
    expect(can(await as(ID.helgi), "cancel_incident", { incident: incident(ID.clientHelgi, status, ID.juri) })).toBe(true);
  });

  it.each(["helper_arrived", "resolved", "cancelled"] as const)("keelab Helgil tühistada olekus %s", async (status) => {
    expect(can(await as(ID.helgi), "cancel_incident", { incident: incident(ID.clientHelgi, status, ID.juri) })).toBe(false);
  });

  it.each([
    ["Mari", ID.mari],
    ["Kalle", ID.kalle],
  ])("keelab tühistamise kasutajale %s", async (_name, userId) => {
    expect(can(await as(userId), "cancel_incident", { incident: incident(ID.clientHelgi, "open") })).toBe(false);
  });
});

describe("accept_incident", () => {
  it.each([
    ["Jüri", ID.juri],
    ["Mari", ID.mari],
    ["Liis", ID.liis],
  ])("lubab kasutajal %s Helgi kutse vastu võtta", async (_name, userId) => {
    expect(can(await as(userId), "accept_incident", { incident: helgiOpen })).toBe(true);
  });

  it("keelab vastuvõtu, kui keegi on juba teel", async () => {
    const onWay = incident(ID.clientHelgi, "helper_on_way", ID.juri);
    for (const userId of [ID.juri, ID.mari, ID.liis, ID.peeter, ID.helgi, ID.kalle]) {
      expect(can(await as(userId), "accept_incident", { incident: onWay })).toBe(false);
    }
  });

  it("keelab Jüril Lembiti kutse vastu võtta", async () => {
    expect(can(await as(ID.juri), "accept_incident", { incident: lembitOpen })).toBe(false);
  });

  it.each([
    ["Helgi", ID.helgi],
    ["Kalle", ID.kalle],
  ])("keelab vastuvõtu kasutajale %s", async (_name, userId) => {
    expect(can(await as(userId), "accept_incident", { incident: helgiOpen })).toBe(false);
  });
});

describe("mark_arrived", () => {
  it("lubab määratud täitjal märkida kohalejõudmise", async () => {
    expect(
      can(await as(ID.juri), "mark_arrived", { incident: incident(ID.clientHelgi, "helper_on_way", ID.juri) }),
    ).toBe(true);
  });

  it("keelab teisel täitjal märkida kohalejõudmise", async () => {
    expect(
      can(await as(ID.mari), "mark_arrived", { incident: incident(ID.clientHelgi, "helper_on_way", ID.juri) }),
    ).toBe(false);
  });

  it("lubab koordinaatoril märkida organisatsiooni kliendi juhtumi", async () => {
    expect(
      can(await as(ID.peeter), "mark_arrived", { incident: incident(ID.clientHelgi, "helper_on_way", ID.liis) }),
    ).toBe(true);
  });

  it.each(["open", "helper_arrived"] as const)("lubab olekus %s kohale jõuda ainult süsteemiadminil", async (status) => {
    const item = incident(ID.clientHelgi, status, ID.juri);
    for (const userId of [ID.juri, ID.mari, ID.liis, ID.peeter, ID.helgi]) {
      expect(can(await as(userId), "mark_arrived", { incident: item })).toBe(false);
    }
    expect(can(await as(ID.anna), "mark_arrived", { incident: item })).toBe(true);
  });
});

describe("close_incident", () => {
  it.each(["helper_on_way", "helper_arrived"] as const)("lubab määratud täitjal sulgeda olekus %s", async (status) => {
    expect(can(await as(ID.juri), "close_incident", { incident: incident(ID.clientHelgi, status, ID.juri) })).toBe(true);
  });

  it("keelab teisel täitjal sulgeda", async () => {
    expect(
      can(await as(ID.mari), "close_incident", { incident: incident(ID.clientHelgi, "helper_arrived", ID.juri) }),
    ).toBe(false);
  });

  it("lubab koordinaatoril sulgeda", async () => {
    expect(
      can(await as(ID.peeter), "close_incident", { incident: incident(ID.clientHelgi, "helper_on_way", ID.liis) }),
    ).toBe(true);
  });

  it.each(["open", "resolved", "cancelled"] as const)("lubab olekus %s sulgeda ainult süsteemiadminil", async (status) => {
    const item = incident(ID.clientHelgi, status, ID.juri);
    for (const userId of [ID.juri, ID.mari, ID.peeter, ID.helgi]) {
      expect(can(await as(userId), "close_incident", { incident: item })).toBe(false);
    }
    expect(can(await as(ID.anna), "close_incident", { incident: item })).toBe(true);
  });
});

describe("view_access", () => {
  it.each([
    ["Mari", ID.mari],
    ["Kalle", ID.kalle],
  ])("lubab ligipääsuandmeid näha kasutajal %s", async (_name, userId) => {
    expect(can(await as(userId), "view_access", { incident: helgiOpen })).toBe(true);
  });

  it.each(["helper_on_way", "helper_arrived", "resolved"] as const)(
    "lubab määratud täitjal näha ligipääsu olekus %s",
    async (status) => {
      expect(can(await as(ID.juri), "view_access", { incident: incident(ID.clientHelgi, status, ID.juri) })).toBe(true);
    },
  );

  it("keelab määratud täitjal näha ligipääsu, kuni kutse on veel avatud", async () => {
    expect(can(await as(ID.juri), "view_access", { incident: incident(ID.clientHelgi, "open", ID.juri) })).toBe(false);
  });

  it("keelab ligipääsu täitjal, kes kutset vastu ei võtnud", async () => {
    expect(can(await as(ID.juri), "view_access", { incident: incident(ID.clientHelgi, "helper_on_way", ID.liis) })).toBe(
      false,
    );
  });
});

describe("view_queue", () => {
  it.each([
    ["Jüri", ID.juri],
    ["Mari", ID.mari],
    ["Liis", ID.liis],
    ["Peeter", ID.peeter],
  ])("lubab järjekorda kasutajal %s", async (_name, userId) => {
    expect(can(await as(userId), "view_queue")).toBe(true);
  });

  it.each([
    ["Helgi", ID.helgi],
    ["Kalle", ID.kalle],
  ])("keelab järjekorra kasutajal %s", async (_name, userId) => {
    expect(can(await as(userId), "view_queue")).toBe(false);
  });
});

describe("admin_system", () => {
  const actions: Action[] = [
    "call_help",
    "cancel_incident",
    "view_client",
    "edit_client",
    "manage_helpers",
    "set_kov_consent",
    "view_access",
    "view_queue",
    "accept_incident",
    "mark_arrived",
    "close_incident",
    "view_org",
    "assign_helper",
    "admin_system",
    "view_kov",
    "mark_kov",
  ];

  it.each(actions)("annab Annale õiguse %s", async (action) => {
    expect(can(await as(ID.anna), action, { incident: helgiOpen, clientId: ID.clientHelgi })).toBe(true);
  });
});
