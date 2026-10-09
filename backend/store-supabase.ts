import { ApiError } from "./errors";
import { createSeed } from "./seed";
import type { Db } from "./types";

const ROW_ID = "main";

type Row = { data: Db; version: number };

function endpoint() {
  const url = process.env.SUPABASE_URL || "";
  return `${url.replace(/\/$/, "")}/rest/v1/demo_state`;
}

function keyPrefix(key: string) {
  if (key.startsWith("eyJ")) return "eyJ";
  if (key.startsWith("sb_secret_")) return "sb_secret_";
  return "muu";
}

function requestHeaders(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function pause() {
  const ms = 50 + Math.floor(Math.random() * 101);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withoutKey(text: string, key: string) {
  if (!key) return text;
  return text.split(key).join("[redacted]");
}

export class SupabaseStore {
  private async send<T>(method: string, query: string, init: { body?: string; headers?: Record<string, string> } = {}): Promise<T> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const response = await fetch(`${endpoint()}${query}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: requestHeaders(init.headers),
      body: init.body,
    });
    const text = await response.text();
    if (response.status === 401) {
      console.error(`Uppis: Supabase vastas 401, võtme eesliide ${keyPrefix(key)}`);
    }
    if (!response.ok) {
      throw new Error(`Supabase ${response.status}: ${withoutKey(text, key).slice(0, 200)}`);
    }
    if (!text) return [] as T;
    return JSON.parse(text) as T;
  }

  async read(): Promise<{ db: Db; version: number }> {
    const rows = await this.send<Row[]>("GET", "?id=eq.main&select=data,version");
    if (rows.length > 0) return { db: rows[0].data, version: rows[0].version };
    await this.send("POST", "", {
      body: JSON.stringify({ id: ROW_ID, data: createSeed(), version: 0 }),
      headers: { Prefer: "resolution=ignore-duplicates" },
    });
    const again = await this.send<Row[]>("GET", "?id=eq.main&select=data,version");
    if (!again.length) throw new Error("Supabase demo_state rida puudub");
    return { db: again[0].data, version: again[0].version };
  }

  async update(mutate: (db: Db) => void): Promise<Db> {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const { db, version } = await this.read();
      mutate(db);
      const rows = await this.send<Row[]>("PATCH", `?id=eq.${ROW_ID}&version=eq.${version}`, {
        body: JSON.stringify({
          data: db,
          version: version + 1,
          updated_at: new Date().toISOString(),
        }),
        headers: { Prefer: "return=representation" },
      });
      if (rows.length > 0) return db;
      if (attempt < 5) await pause();
    }
    throw new ApiError("Andmed muutusid samal ajal, proovi uuesti", 409, "CONFLICT");
  }

  async reset(): Promise<Db> {
    const data = createSeed();
    const existing = await this.send<Row[]>("GET", "?id=eq.main&select=version");
    if (!existing.length) {
      await this.send("POST", "", {
        body: JSON.stringify({ id: ROW_ID, data, version: 0 }),
      });
      return data;
    }
    await this.send("PATCH", `?id=eq.${ROW_ID}`, {
      body: JSON.stringify({ data, version: existing[0].version + 1 }),
      headers: { Prefer: "return=representation" },
    });
    return data;
  }
}
