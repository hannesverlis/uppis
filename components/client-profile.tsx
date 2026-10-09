"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useEmbedded, usePageTitle, useSessionUserId } from "./app-shell";
import { useWithActor } from "./use-with-actor";
import { formatClock, formatWhen, outcomeLabel, statusLabel } from "./labels";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ListRow } from "./ui/list-row";
import { MapBackdrop } from "./ui/map-backdrop";
import { StatusPill } from "./ui/status-pill";

type Profile = {
  id: string;
  elderName: string;
  phone: string | null;
  address: string;
  municipalityName: string;
  accessNotes: string | null;
  kovConsent: boolean;
  canEdit: boolean;
  canManageHelpers: boolean;
  canSetConsent: boolean;
  contacts: { name: string; relation: string; phone: string | null }[];
  helpers: { userId: string | null; organizationId: string | null; priority: number; label: string | null }[];
  helperOptions: {
    users: { id: string; name: string }[];
    organizations: { id: string; name: string }[];
  };
  incidents: { id: string; createdAt: string; status: string; outcome: string | null; helperName: string | null }[];
};

type HelpSnapshot = {
  clientName: string;
  active: {
    status: string;
    createdAt: string;
    helperName: string | null;
    helperEtaMin: number | null;
    acceptedAt: string | null;
  } | null;
  finished: { status: string; outcome: string | null } | null;
};

function bannerText(view: HelpSnapshot): string {
  const active = view.active;
  if (active?.status === "open") {
    return `${view.clientName} kutsus abi kell ${formatClock(active.createdAt)}. Ootame abistajat.`;
  }
  if (active?.status === "helper_on_way") {
    const start = active.acceptedAt ?? active.createdAt;
    const eta = new Date(new Date(start).getTime() + (active.helperEtaMin ?? 0) * 60_000).toISOString();
    return `${active.helperName ?? "Abistaja"} on teel, saabub ~${formatClock(eta)}.`;
  }
  if (active?.status === "helper_arrived") {
    return `${active.helperName ?? "Abistaja"} on kohal.`;
  }
  if (active?.status === "escalated_112") {
    return "See võib olla terviseoht.";
  }
  if (view.finished?.status === "resolved" || view.finished?.status === "cancelled") {
    const result =
      view.finished.status === "cancelled" ? "Tühistatud" : outcomeLabel(view.finished.outcome) || "Lõpetatud";
    return `Juhtum lõpetatud: ${result}`;
  }
  return "";
}

function ContactIncidentBanner({ clientId }: { clientId: string }) {
  const userId = useSessionUserId();
  const [allowed, setAllowed] = useState(false);
  const [text, setText] = useState("");
  const [snap, setSnap] = useState<HelpSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ me: { roles: string[] } | null }>("/api/bootstrap")
      .then((data) => {
        const roles = data.me?.roles ?? [];
        if (!cancelled) setAllowed(roles.includes("client_relative") || roles.includes("client_guardian"));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!allowed) {
      setText("");
      return;
    }
    let cancelled = false;

    async function load() {
      const data = await api<HelpSnapshot>(`/api/clients/${clientId}/help`);
      if (!cancelled) {
        setSnap(data);
        setText(bannerText(data));
      }
    }

    load().catch(() => undefined);
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [allowed, clientId, userId]);

  if (!text || !snap) return null;
  const status = snap.active?.status ?? snap.finished?.status ?? "resolved";
  const bar =
    status === "open"
      ? "border-l-warning-ink"
      : status === "escalated_112"
        ? "border-l-danger"
        : status === "resolved" || status === "cancelled"
          ? "border-l-border"
          : "border-l-brand";
  return (
    <Card className={`border-l-4 ${bar}`}>
      <StatusPill status={status} />
      <p className="mt-2 text-xl font-semibold" aria-live="polite">
        {text}
      </p>
      {snap.active?.status === "helper_on_way" ? (
        <MapBackdrop helperName={snap.active.helperName} className="mt-3 h-[140px] rounded-card" />
      ) : null}
    </Card>
  );
}

export function ClientProfile({ clientId }: { clientId: string }) {
  const userId = useSessionUserId();
  const embedded = useEmbedded();
  const withActor = useWithActor();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [address, setAddress] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [helperPick, setHelperPick] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function apply(data: Profile) {
    setProfile(data);
    setAddress(data.address);
    setAccessNotes(data.accessNotes ?? "");
  }

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError("");
    api<Profile>(`/api/clients/${clientId}`)
      .then((data) => {
        if (!cancelled) apply(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiRequestError ? reason.message : "Profiili ei saanud laadida.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, userId]);

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      apply(await api<Profile>(`/api/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(body) }));
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Salvestamine ebaõnnestus.");
    } finally {
      setSaving(false);
    }
  }

  async function addHelper() {
    if (!helperPick) return;
    const [kind, id] = helperPick.split(":");
    const body = kind === "org" ? { organizationId: id } : { userId: id };
    setSaving(true);
    setError("");
    try {
      apply(
        await api<Profile>(`/api/clients/${clientId}/helpers`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      setHelperPick("");
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Täitjat ei saanud lisada.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHelper(helper: Profile["helpers"][number]) {
    setSaving(true);
    setError("");
    try {
      apply(
        await api<Profile>(`/api/clients/${clientId}/helpers`, {
          method: "DELETE",
          body: JSON.stringify({
            userId: helper.userId,
            organizationId: helper.organizationId,
          }),
        }),
      );
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Täitjat ei saanud eemaldada.");
    } finally {
      setSaving(false);
    }
  }

  usePageTitle(profile?.elderName ?? "Profiil");

  if (error && !profile) {
    return <p className="text-xl font-semibold text-danger">{error}</p>;
  }
  if (!profile) {
    return <p className="text-xl">Laen profiili…</p>;
  }

  const showAccess = profile.canEdit || profile.accessNotes !== null;

  return (
    <main className="flex flex-col gap-6">
      <div>
        {embedded ? <h1 className="text-2xl font-bold">{profile.elderName}</h1> : null}
        <Link className="text-base font-semibold text-brand underline" href={withActor("/kliendid")}>
          Kliendid
        </Link>
        <div className="mt-3">
          <ContactIncidentBanner clientId={clientId} />
        </div>
        <Link className="mt-3 inline-flex min-h-11 items-center text-xl font-bold text-brand underline" href={withActor(`/kliendid/${clientId}/abi`)}>
          Abi-vaade
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Aadress</h2>
        {profile.canEdit ? (
          <input
            className="mt-2 min-h-14 w-full rounded-card border border-border bg-surface px-3 text-xl"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        ) : (
          <p className="mt-2 text-xl">{profile.address}</p>
        )}
        {showAccess ? (
          <>
            <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Ligipääs</h2>
            {profile.canEdit ? (
              <textarea
                className="mt-2 min-h-24 w-full rounded-card border border-border bg-surface px-3 py-2 text-xl"
                value={accessNotes}
                onChange={(event) => setAccessNotes(event.target.value)}
              />
            ) : (
              <p className="mt-2 text-xl">{profile.accessNotes}</p>
            )}
          </>
        ) : null}
        {profile.canEdit ? (
          <Button className="mt-4" size="elder" disabled={saving} onClick={() => save({ address, accessNotes })}>
            Salvesta
          </Button>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Omavalitsus</h2>
        <p className="mt-2 text-xl">
          {profile.kovConsent ? "Juhtumid jõuavad omavalitsuseni." : "Juhtumeid omavalitsusele ei saadeta."}
        </p>
        {profile.canSetConsent ? (
          <Button className="mt-4" variant="secondary" size="elder" disabled={saving} onClick={() => save({ kovConsent: !profile.kovConsent })}>
            {profile.kovConsent ? "Võta nõusolek tagasi" : "Anna nõusolek"}
          </Button>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Lähedased</h2>
        <div className="mt-1">
          {profile.contacts.map((contact) => (
            <ListRow
              key={`${contact.name}-${contact.relation}`}
              title={contact.name}
              subtitle={`${contact.relation}${contact.phone ? ` · ${contact.phone}` : ""}`}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Täitjad</h2>
        <div className="mt-1">
          {profile.helpers.map((helper) => (
            <ListRow
              key={`${helper.userId ?? ""}-${helper.organizationId ?? ""}`}
              title={helper.label ?? "Täitja"}
              trailing={
                profile.canManageHelpers ? (
                  <button
                    className="min-h-11 px-2 text-base font-semibold text-danger underline disabled:opacity-40"
                    type="button"
                    disabled={saving}
                    onClick={() => removeHelper(helper)}
                  >
                    Eemalda
                  </button>
                ) : null
              }
            />
          ))}
        </div>
        {profile.canManageHelpers ? (
          <div className="mt-3 flex flex-col gap-2">
            <select
              className="min-h-16 rounded-card border border-border bg-surface px-3 text-xl"
              value={helperPick}
              onChange={(event) => setHelperPick(event.target.value)}
            >
              <option value="">Vali täitja</option>
              <optgroup label="Inimesed">
                {profile.helperOptions.users.map((user) => (
                  <option key={user.id} value={`user:${user.id}`}>
                    {user.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Organisatsioonid">
                {profile.helperOptions.organizations.map((org) => (
                  <option key={org.id} value={`org:${org.id}`}>
                    {org.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <Button size="elder" disabled={saving || !helperPick} onClick={addHelper}>
              Lisa täitja
            </Button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Juhtumid</h2>
        {profile.incidents.length === 0 ? <p className="mt-2 text-xl">Juhtumeid pole.</p> : null}
        <div className="mt-1">
          {profile.incidents.map((incident) => (
            <ListRow
              key={incident.id}
              title={formatWhen(incident.createdAt)}
              subtitle={`${statusLabel(incident.status)}${incident.outcome ? ` · ${outcomeLabel(incident.outcome)}` : ""}${incident.helperName ? ` · ${incident.helperName}` : ""}`}
            />
          ))}
        </div>
      </section>

      {error ? <p className="text-xl font-semibold text-danger">{error}</p> : null}
    </main>
  );
}
