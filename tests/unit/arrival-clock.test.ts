import { describe, expect, it } from "vitest";
import { isArrivalLate } from "../../components/arrival-time";

describe("saabumiskell", () => {
  const from = "2026-10-09T12:00:00.000Z";
  const minutes = 10;
  const due = new Date(from).getTime() + minutes * 60_000;

  it("ei ole hilinenud sekund enne saabumisaega", () => {
    expect(isArrivalLate(from, minutes, due - 1000)).toBe(false);
  });

  it("ei ole hilinenud täpselt saabumisajal, sest võrdlus on range", () => {
    expect(isArrivalLate(from, minutes, due)).toBe(false);
  });

  it("on hilinenud sekund pärast saabumisaega", () => {
    expect(isArrivalLate(from, minutes, due + 1000)).toBe(true);
  });
});
