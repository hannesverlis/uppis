import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../backend/errors";
import { createSeed } from "../../backend/seed";
import { SupabaseStore } from "../../backend/store-supabase";
import type { Db } from "../../backend/types";

const KEY = "sb_secret_unit_only";
const URL = "https://example.supabase.co";

type Row = { data: Db; version: number };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Supabase hoidla", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  function useEnv() {
    process.env.SUPABASE_URL = URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = KEY;
  }

  it("loob puuduva rea seemnest", async () => {
    useEnv();
    const posts: unknown[] = [];
    let stored: Row | null = null;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "POST") {
        posts.push(JSON.parse(String(init?.body)));
        stored = { data: createSeed(), version: 0 };
        return jsonResponse([]);
      }
      return jsonResponse(stored ? [stored] : []);
    }) as typeof fetch;

    const row = await new SupabaseStore().read();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ id: "main", version: 0 });
    expect(row.version).toBe(0);
    expect(row.db.users.length).toBeGreaterThan(0);
    const headers = new Headers((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers);
    expect(headers.get("Prefer")).toBeNull();
    const postCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[1]?.method === "POST");
    expect(new Headers(postCall[1].headers).get("Prefer")).toBe("resolution=ignore-duplicates");
  });

  it("suurendab uuendusel versiooni", async () => {
    useEnv();
    let stored: Row = { data: createSeed(), version: 3 };
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return jsonResponse([stored]);
      const body = JSON.parse(String(init?.body)) as Row;
      stored = { data: body.data, version: body.version };
      return jsonResponse([stored]);
    }) as typeof fetch;

    const db = await new SupabaseStore().update((data) => {
      data.users[0].name = "Muudetud";
    });
    expect(db.users[0].name).toBe("Muudetud");
    expect(stored.version).toBe(4);
  });

  it("kordab uuendust üks kord, kui esimene kirjutamine põrkab", async () => {
    useEnv();
    let version = 2;
    let data = createSeed();
    let patches = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const url = String(input);
      if (method === "GET") return jsonResponse([{ data, version }]);
      patches += 1;
      if (patches === 1) {
        version = 8;
        return jsonResponse([]);
      }
      expect(url).toContain("version=eq.8");
      const body = JSON.parse(String(init?.body)) as Row;
      data = body.data;
      version = body.version;
      return jsonResponse([{ data, version }]);
    }) as typeof fetch;

    const db = await new SupabaseStore().update((row) => {
      row.users[0].name = "Pärast konflikti";
    });
    expect(patches).toBe(2);
    expect(db.users[0].name).toBe("Pärast konflikti");
    expect(version).toBe(9);
  });

  it("annab viie konflikti järel vea 409", async () => {
    useEnv();
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return jsonResponse([{ data: createSeed(), version: 1 }]);
      return jsonResponse([]);
    }) as typeof fetch;

    const error = await new SupabaseStore()
      .update(() => undefined)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).code).toBe("CONFLICT");
    const patches = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((call) => call[1]?.method === "PATCH");
    expect(patches).toHaveLength(5);
  });

  it("ei kirjuta, kui muutus viskab ApiError", async () => {
    useEnv();
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return jsonResponse([{ data: createSeed(), version: 1 }]);
      return jsonResponse([]);
    }) as typeof fetch;

    const error = await new SupabaseStore()
      .update(() => {
        throw new ApiError("Ei salvesta", 400, "VALIDATION");
      })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    const patches = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((call) => call[1]?.method === "PATCH");
    expect(patches).toHaveLength(0);
  });

  it("saadab võtme päises, aga ei pane seda veateatesse", async () => {
    useEnv();
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe(KEY);
      expect(headers.get("Authorization")).toBeNull();
      return new Response("denied", { status: 401 });
    }) as typeof fetch;

    const error = await new SupabaseStore().read().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(KEY);
    expect(errors.mock.calls.map((call) => String(call[0])).join(" ")).toContain("sb_secret_");
    expect(errors.mock.calls.map((call) => String(call[0])).join(" ")).not.toContain(KEY);
  });
});
