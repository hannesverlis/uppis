import assert from "node:assert/strict";
import { test } from "node:test";
import { withActor } from "../components/actor-link.ts";

test("leaves a link unchanged when no demo user is active", () => {
  assert.equal(withActor("/kliendid", null, "client"), "/kliendid");
});

test("adds the demo user and tone", () => {
  assert.equal(withActor("/kliendid/1/abi", "abc", "client"), "/kliendid/1/abi?as=abc&tone=client");
});

test("keeps an actor that is already on the link", () => {
  assert.equal(withActor("/kliendid?as=keep", "other", "client"), "/kliendid?as=keep&tone=client");
});

test("does not rewrite a phone link", () => {
  assert.equal(withActor("tel:112", "abc", "client"), "tel:112");
});
