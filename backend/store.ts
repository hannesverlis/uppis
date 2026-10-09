import fs from "fs";
import path from "path";
import { createSeed } from "./seed";
import type { Db } from "./types";

function dbFile() {
  const configured = process.env.UPPIS_DB_FILE;
  if (!configured) return path.join(process.cwd(), "data", "demo-db.json");
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function readDb(): Db {
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

export function writeDb(db: Db) {
  const file = dbFile();
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
