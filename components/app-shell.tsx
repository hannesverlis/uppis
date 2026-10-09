"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { withActor } from "./actor-link";
import { roleList } from "./roles";

type SwitcherUser = {
  id: string;
  name: string;
  roles: string[];
};

type Me = {
  id: string;
  name: string;
  roles: string[];
};

const SessionUserContext = createContext<string | null>(null);

export function useSessionUserId() {
  return useContext(SessionUserContext);
}

const NAV = [
  { href: "/kliendid", label: "Kliendid" },
  { href: "/taitjad", label: "Täitjad" },
  { href: "/admin", label: "Admin" },
] as const;

export type ShellTone = "client" | "helper" | "admin";

const TONE_LABEL: Record<ShellTone, string> = {
  client: "Klient",
  helper: "Täitja",
  admin: "Admin",
};

export function AppShell({
  children,
  actor = null,
  tone = null,
}: {
  children: ReactNode;
  actor?: string | null;
  tone?: ShellTone | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [users, setUsers] = useState<SwitcherUser[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/bootstrap", {
      cache: "no-store",
      headers: actor ? { "x-uppis-user": actor } : {},
    });
    if (!response.ok) throw new Error("bootstrap");
    const data = (await response.json()) as { users: SwitcherUser[]; me: Me | null };
    setUsers(data.users);
    setMe(data.me);
  }, [actor]);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => {
        if (!cancelled) setError("Kasutajaid ei saanud laadida.");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onUserChange(userId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: userId || null }),
      });
      if (!response.ok) throw new Error("session");
      const data = (await response.json()) as { me: Me | null };
      setMe(data.me);
      router.refresh();
    } catch {
      setError("Kasutaja valik ei õnnestunud.");
    } finally {
      setSaving(false);
    }
  }

  const clientView = pathname === "/kliendid" || pathname.startsWith("/kliendid/");
  const helperView = pathname === "/taitjad" || pathname.startsWith("/taitjad/");
  const menuUsers = clientView
    ? users.filter((user) => user.roles.includes("client_elder"))
    : helperView
      ? users.filter((user) => user.roles.some((role) => role.startsWith("helper_")))
      : users;
  const menuValue = menuUsers.some((user) => user.id === me?.id) ? (me?.id ?? "") : "";
  const menuLabel = clientView ? "Vali abivajaja" : helperView ? "Vali abistaja" : "Vali demokasutaja";
  const emptyLabel = clientView
    ? "Abivajajat pole valitud"
    : helperView
      ? "Abistajat pole valitud"
      : "Kasutajat pole valitud";

  const embedded = Boolean(actor);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg px-4 text-ink">
      <header className="py-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {embedded ? (
            "Uppis"
          ) : (
            <Link href={withActor("/", actor, tone)} className="text-inherit">
              Uppis
            </Link>
          )}
        </p>
        {tone ? (
          <p className="mt-1 inline-flex rounded-pill bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
            {TONE_LABEL[tone]}
          </p>
        ) : null}
        {embedded ? (
          <p className="mt-2 text-2xl font-extrabold">{me ? me.name : "…"}</p>
        ) : null}
        {embedded ? null : (
        <nav aria-label="Põhimenüü" className="mt-3 grid grid-cols-3 gap-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={withActor(item.href, actor, tone)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-2 text-center text-lg font-bold ${
                  active ? "bg-brand text-white" : "bg-surface text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        )}
        {embedded ? null : (
        <>
        <label className="mt-4 block text-base font-semibold" htmlFor="demo-user">
          {menuLabel}
        </label>
        <select
          id="demo-user"
          className="mt-2 min-h-16 w-full rounded-2xl border-2 border-ink bg-bg px-3 text-xl"
          value={menuValue}
          disabled={!ready || saving}
          onChange={(event) => onUserChange(event.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {menuUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} — {roleList(user.roles)}
            </option>
          ))}
        </select>
        <p className="mt-2 text-base" aria-live="polite">
          {me ? `Oled: ${me.name} · ${roleList(me.roles)}` : "Kedagi pole valitud."}
        </p>
        {error ? <p className="mt-2 text-base font-semibold text-danger">{error}</p> : null}
        </>
        )}
      </header>
      <SessionUserContext.Provider value={actor ?? me?.id ?? null}>
        <div className="flex-1 pb-8">{children}</div>
      </SessionUserContext.Provider>
      <footer className="border-t border-border py-4 text-base">
        Demo. Hädaohu korral helista <a className="font-bold text-danger underline" href="tel:112">112</a>.
      </footer>
    </div>
  );
}
