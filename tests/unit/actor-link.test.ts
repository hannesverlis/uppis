import { describe, expect, it } from "vitest";
import { withActor } from "../../components/actor-link";

describe("withActor", () => {
  it("leaves a link unchanged when no demo user is active", () => {
    expect(withActor("/kliendid", null, "client")).toBe("/kliendid");
  });

  it("adds the demo user and tone", () => {
    expect(withActor("/kliendid/1/abi", "abc", "client")).toBe("/kliendid/1/abi?as=abc&tone=client");
  });

  it("keeps an actor that is already on the link", () => {
    expect(withActor("/kliendid?as=keep", "other", "client")).toBe("/kliendid?as=keep&tone=client");
  });

  it("does not rewrite a phone link", () => {
    expect(withActor("tel:112", "abc", "client")).toBe("tel:112");
  });
});
