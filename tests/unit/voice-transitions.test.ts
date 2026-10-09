import { describe, expect, it } from "vitest";
import { clipFor } from "../../components/voice-plan";

function heard(id: string, status: string, late = false) {
  return { id, status, late };
}

describe("häälteate valik", () => {
  it("ei mängi teadet, kui leht laeb juba avatud kutse", () => {
    expect(clipFor(null, { ...heard("a", "open"), etaMin: null })).toBeNull();
  });

  it("mängib teeloleku teate, kui kutse võetakse vastu", () => {
    expect(clipFor(heard("a", "open"), { ...heard("a", "helper_on_way"), etaMin: 10 })).toBe("abi-teel-10");
  });

  it("mängib kohalejõudmise teate", () => {
    expect(clipFor(heard("a", "helper_on_way"), { ...heard("a", "helper_arrived"), etaMin: 10 })).toBe(
      "abistaja-kohal",
    );
  });

  it("mängib hilinemise teate, kui sama sõit läheb üle aja", () => {
    expect(clipFor(heard("a", "helper_on_way", false), { ...heard("a", "helper_on_way", true), etaMin: 10 })).toBe(
      "abistaja-hilineb",
    );
  });

  it("ei korda teadet, kui olek ei muutu", () => {
    expect(clipFor(heard("a", "helper_on_way"), { ...heard("a", "helper_on_way"), etaMin: 10 })).toBeNull();
  });

  it("ei mängi teadet, kui juhtum lõpeb", () => {
    expect(clipFor(heard("a", "helper_arrived"), null)).toBeNull();
  });

  it("käsitleb teist juhtumit uue juhtumina ega mängi vana teadet", () => {
    expect(clipFor(heard("a", "helper_on_way"), { ...heard("b", "helper_on_way", true), etaMin: 10 })).toBeNull();
  });

  it("ei mängi teadet, kui avatud kutse jääb avatuks", () => {
    expect(clipFor(heard("a", "open"), { ...heard("a", "open"), etaMin: null })).toBeNull();
  });
});
