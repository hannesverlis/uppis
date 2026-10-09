"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { withActor } from "./actor-link";
import { roleList } from "./roles";
import { Avatar } from "./ui/avatar";
import { BottomSheet } from "./ui/bottom-sheet";
import { ListRow } from "./ui/list-row";
import { Logo } from "./ui/logo";

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
const EmbeddedContext = createContext(false);
const TitleContext = createContext<(value: string | null) => void>(() => undefined);

export function useSessionUserId() {
  return useContext(SessionUserContext);
}

export function useEmbedded() {
  return useContext(EmbeddedContext);
}

export function usePageTitle(title: string | null) {
  const setTitle = useContext(TitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
}

export type ShellTone = "client" | "helper" | "admin";

const TONE_LABEL: Record<ShellTone, string> = {
  client: "Klient",
  helper: "Täitja",
  admin: "Admin",
};

function fallbackTitle(pathname: string) {
  if (pathname === "/taitjad" || pathname.startsWith("/taitjad/")) return "Kutsed";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "Admin";
  if (pathname === "/kliendid") return "Kliendid";
  if (pathname === "/valik") return "Vali osa";
  if (/^\/kliendid\/[^/]+$/.test(pathname)) return "Profiil";
  return "Uppis";
}

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
  const [open, setOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

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
      setOpen(false);
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
  const menuLabel = clientView ? "Vali abivajaja" : helperView ? "Vali abistaja" : "Vali demokasutaja";
  const embedded = Boolean(actor);
  const mapPage = /^\/kliendid\/[^/]+\/abi$/.test(pathname);
  const title = pageTitle || fallbackTitle(pathname);

  const avatar = (
    <button
      type="button"
      className="flex h-11 w-11 items-center justify-center bg-white shadow-card disabled:opacity-40"
      style={{ borderRadius: "var(--radius-icon)" }}
      aria-label={me ? me.name : menuLabel}
      disabled={!ready || saving}
      onClick={() => {
        if (!embedded) setOpen(true);
      }}
    >
      <Avatar name={me?.name ?? "?"} size={32} />
    </button>
  );

  return (
    <EmbeddedContext.Provider value={embedded}>
      <TitleContext.Provider value={setPageTitle}>
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg text-ink">
          {mapPage ? (
            <header className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-[480px] items-start justify-between p-4">
              {embedded ? (
                <span />
              ) : (
                <Link
                  href={withActor("/", actor, tone)}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center bg-white shadow-card"
                  style={{ borderRadius: "var(--radius-icon)" }}
                  aria-label="Uppis"
                >
                  <Logo variant="icon" height={28} />
                </Link>
              )}
              <div className="pointer-events-auto">{avatar}</div>
            </header>
          ) : (
            <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div className="min-w-0">
                {embedded ? null : <Logo variant="light" height={28} />}
                {embedded ? null : <h1 className="mt-3 text-2xl font-bold">{title}</h1>}
                {embedded ? null : (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {me ? roleList(me.roles) : tone ? TONE_LABEL[tone] : "Demo"}
                  </p>
                )}
              </div>
              {avatar}
            </header>
          )}
          <SessionUserContext.Provider value={actor ?? me?.id ?? null}>
            <div className={mapPage ? "" : "px-5 pb-8"}>{children}</div>
          </SessionUserContext.Provider>
          {mapPage ? null : (
            <footer className="border-t border-border px-5 py-4 text-base">
              Demo. Hädaohu korral helista{" "}
              <a className="font-bold text-danger underline" href="tel:112">
                112
              </a>
              .
            </footer>
          )}
          {open ? (
            <BottomSheet label={menuLabel} className="z-50">
              <h2 className="text-xl font-bold">{menuLabel}</h2>
              <div className="mt-2">
                {menuUsers.map((user) => (
                  <ListRow
                    key={user.id}
                    leading={<Avatar name={user.name} size={40} />}
                    title={user.name}
                    subtitle={roleList(user.roles)}
                    onClick={() => void onUserChange(user.id)}
                  />
                ))}
              </div>
              {menuUsers.length === 0 ? <p className="py-3 text-ink-muted">Kedagi pole valitud.</p> : null}
              {error ? <p className="mt-2 font-semibold text-danger">{error}</p> : null}
              <button type="button" className="mt-3 min-h-11 text-base font-semibold text-brand" onClick={() => setOpen(false)}>
                Sulge
              </button>
            </BottomSheet>
          ) : null}
        </div>
      </TitleContext.Provider>
    </EmbeddedContext.Provider>
  );
}
