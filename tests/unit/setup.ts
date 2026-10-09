import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";
import { resetDb } from "../../backend/store";

let dbFile = "";

beforeEach(() => {
  dbFile = path.join(os.tmpdir(), `uppis-test-${randomUUID()}.json`);
  process.env.UPPIS_DB_FILE = dbFile;
  resetDb();
});

afterEach(() => {
  if (dbFile && fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  const tmp = `${dbFile}.tmp`;
  if (dbFile && fs.existsSync(tmp)) fs.unlinkSync(tmp);
  delete process.env.UPPIS_DB_FILE;
  vi.useRealTimers();
});
