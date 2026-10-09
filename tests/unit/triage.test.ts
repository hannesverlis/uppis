import { describe, expect, it } from "vitest";
import { CLEAR_TRIAGE, emptyTriage, needsEmergency, parseTriage } from "../../backend/triage";
import type { TriageAnswers } from "../../backend/types";

const KEYS = [
  "hitHead",
  "severePainOrCantMove",
  "bleeding",
  "breathingOrChestPain",
  "onFloorOverHour",
] as const satisfies readonly (keyof TriageAnswers)[];

describe("triaaž", () => {
  it("ei loe kõiki eitavaid vastuseid hädaolukorraks", () => {
    expect(needsEmergency(CLEAR_TRIAGE)).toBe(false);
  });

  it.each(KEYS)("loeb jaatava vastuse %s hädaolukorraks", (key) => {
    expect(needsEmergency({ ...CLEAR_TRIAGE, [key]: true })).toBe(true);
  });

  it.each(KEYS)("loeb vastamata küsimuse %s hädaolukorraks", (key) => {
    const answers = { ...CLEAR_TRIAGE, [key]: null };
    expect(needsEmergency(answers)).toBe(true);
  });

  it.each([
    ["prügi", "prügi"],
    ["null", null],
    ["tekstiline jah", { hitHead: "jah" }],
  ])("käsitleb vigast sisendit %s hädaolukorrana", (_label, input) => {
    expect(needsEmergency(parseTriage(input))).toBe(true);
  });

  it("jätab tundmatu välja vastamata", () => {
    expect(parseTriage({ hitHead: "jah" })).toEqual(emptyTriage());
  });
});
