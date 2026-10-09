import fs from "fs";
import os from "os";
import path from "path";
import { createSeed } from "./seed";
import type { Db } from "./types";

let warnedAboutTmp = false;

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function dbFile() {
  const configured = process.env.UPPIS_DB_FILE;
  if (configured) return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  if (process.env.VERCEL && !supabaseConfigured()) {
    if (!warnedAboutTmp) {
      console.warn("Uppis: SUPABASE_* puudub, kasutan /tmp – andmed võivad kaduda");
      warnedAboutTmp = true;
    }
    return path.join(os.tmpdir(), "uppis-demo-db.json");
  }
  return path.join(process.cwd(), "data", "demo-db.json");
}

function readFileDb(): Db {
  const file = dbFile();
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as Db;
    }
  } catch {
    // A broken demo file falls back to the in-memory seed.
  }
  return createSeed();
}

function writeDb(db: Db) {
  const file = dbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

async function fileRead(): Promise<Db> {
  return readFileDb();
}

async function fileUpdate(mutate: (db: Db) => void): Promise<Db> {
  const db = readFileDb();
  mutate(db);
  writeDb(db);
  return db;
}

async function fileReset(): Promise<Db> {
  const db = createSeed();
  writeDb(db);
  return db;
}

export async function readDb(): Promise<Db> {
  if (!supabaseConfigured()) return fileRead();
  const { SupabaseStore } = await import("./store-supabase");
  return (await new SupabaseStore().read()).db;
}

export async function updateDb(mutate: (db: Db) => void): Promise<Db> {
  if (!supabaseConfigured()) return fileUpdate(mutate);
  const { SupabaseStore } = await import("./store-supabase");
  return new SupabaseStore().update(mutate);
}

export async function resetDb(): Promise<Db> {
  if (!supabaseConfigured()) return fileReset();
  const { SupabaseStore } = await import("./store-supabase");
  return new SupabaseStore().reset();
}
