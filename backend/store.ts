import fs from "fs";
import path from "path";
import { createSeed } from "./seed";
import type { Db } from "./types";

const file = path.join(process.cwd(), "data", "demo-db.json");

export function readDb(): Db {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as Db;
    }
  } catch {
    // A broken demo file falls back to the in-memory seed.
  }
  return createSeed();
}

export function writeDb(db: Db) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function updateDb(mutate: (db: Db) => void): Db {
  const db = readDb();
  mutate(db);
  writeDb(db);
  return db;
}

export function resetDb(): Db {
  const db = createSeed();
  writeDb(db);
  return db;
}
