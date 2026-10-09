import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import { buildSession } from "./session";
import { readDb } from "./store";
import type { SessionUser } from "./types";

const USER_COOKIE = "uppis_user";
const PIN_COOKIE = "uppis_admin_ok";
const ACTOR_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function apiRoute(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<unknown>,
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return json(await fn(req, ctx));
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: error.message, code: error.code }, error.status);
      }
      console.error(error);
      return json({ error: "Serveri viga", code: "SERVER" }, 500);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const headerId = (await headers()).get("x-uppis-user") ?? "";
  const jar = await cookies();
  const id = ACTOR_RE.test(headerId) ? headerId : jar.get(USER_COOKIE)?.value;
  if (!id) return null;
  return buildSession(await readDb(), id);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("Vali demokasutaja", 401, "AUTH");
  return user;
}

export async function setUserCookie(userId: string | null) {
  const jar = await cookies();
  if (!userId) {
    jar.delete(USER_COOKIE);
    return;
  }
  jar.set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function hasAdminPin() {
  const jar = await cookies();
  return jar.get(PIN_COOKIE)?.value === "1";
}

export async function setAdminPinCookie() {
  const jar = await cookies();
  jar.set(PIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function expectedAdminPin() {
  return process.env.ADMIN_DEMO_PIN || "1234";
}

export async function requireAdminPin(user: SessionUser) {
  const isAdmin = user.roles.includes("admin_system") || user.roles.includes("admin_kov");
  if (!isAdmin) throw new ApiError("Puudub õigus", 403, "FORBIDDEN");
  if (!(await hasAdminPin())) throw new ApiError("Sisesta PIN", 401, "PIN");
}
