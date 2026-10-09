"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useSessionUserId } from "./app-shell";
import { formatClock, formatWhen, outcomeLabel, statusLabel } from "./labels";

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
      if (!cancelled) setText(bannerText(data));
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

  if (!text) return null;
  return (
    <p className="rounded-2xl bg-white px-4 py-3 text-xl font-semibold" aria-live="polite">
      {text}
    </p>
  );
}

export function ClientProfile({ clientId }: { clientId: string }) {
  const userId = useSessionUserId();
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

  if (error && !profile) {
    return <p className="text-xl font-semibold text-[#9f1d1d]">{error}</p>;
  }
  if (!profile) {
    return <p className="text-xl">Laen profiili…</p>;
  }

  const showAccess = profile.canEdit || profile.accessNotes !== null;

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link className="text-base font-bold underline" href="/kliendid">
          Kliendid
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{profile.elderName}</h1>
        <div className="mt-3">
          <ContactIncidentBanner clientId={clientId} />
        </div>
        <p className="mt-1 text-xl">{profile.municipalityName}</p>
        {profile.phone ? <p className="text-xl">{profile.phone}</p> : null}
        <Link className="mt-3 inline-block text-xl font-bold underline" href={`/kliendid/${clientId}/abi`}>
          Abi-vaade
        </Link>
      </div>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-xl font-extrabold">Aadress</h2>
        {profile.canEdit ? (
          <input
            className="mt-2 min-h-14 w-full rounded-xl border-2 border-[#1c1915] px-3 text-xl"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        ) : (
          <p className="mt-2 text-xl">{profile.address}</p>
        )}
        {showAccess ? (
          <>
            <h2 className="mt-4 text-xl font-extrabold">Ligipääs</h2>
            {profile.canEdit ? (
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border-2 border-[#1c1915] px-3 py-2 text-xl"
                value={accessNotes}
                onChange={(event) => setAccessNotes(event.target.value)}
              />
            ) : (
              <p className="mt-2 text-xl">{profile.accessNotes}</p>
            )}
          </>
        ) : null}
        {profile.canEdit ? (
          <button
            className="mt-4 min-h-16 w-full rounded-2xl bg-[#0c6b52] px-5 text-xl font-bold text-white disabled:opacity-60"
            type="button"
            disabled={saving}
            onClick={() => save({ address, accessNotes })}
          >
            Salvesta
          </button>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-xl font-extrabold">Omavalitsus</h2>
        <p className="mt-2 text-xl">
          {profile.kovConsent ? "Juhtumid jõuavad omavalitsuseni." : "Juhtumeid omavalitsusele ei saadeta."}
        </p>
        {profile.canSetConsent ? (
          <button
            className="mt-4 min-h-16 w-full rounded-2xl bg-[#1c1915] px-5 text-xl font-bold text-white disabled:opacity-60"
            type="button"
            disabled={saving}
            onClick={() => save({ kovConsent: !profile.kovConsent })}
          >
            {profile.kovConsent ? "Võta nõusolek tagasi" : "Anna nõusolek"}
          </button>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Lähedased</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {profile.contacts.map((contact) => (
            <li key={`${contact.name}-${contact.relation}`} className="rounded-2xl bg-white px-4 py-3 text-xl">
              {contact.name} · {contact.relation}
              {contact.phone ? ` · ${contact.phone}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Täitjad</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {profile.helpers.map((helper) => (
            <li
              key={`${helper.userId ?? ""}-${helper.organizationId ?? ""}`}
              className="rounded-2xl bg-white px-4 py-3"
            >
              <p className="text-xl">{helper.label}</p>
              {profile.canManageHelpers ? (
                <button
                  className="mt-2 min-h-12 text-lg font-bold underline disabled:opacity-60"
                  type="button"
                  disabled={saving}
                  onClick={() => removeHelper(helper)}
                >
                  Eemalda
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {profile.canManageHelpers ? (
          <div className="mt-3 flex flex-col gap-2">
            <select
              className="min-h-16 rounded-2xl border-2 border-[#1c1915] bg-white px-3 text-xl"
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
            <button
              className="min-h-16 rounded-2xl bg-[#0c6b52] px-5 text-xl font-bold text-white disabled:opacity-60"
              type="button"
              disabled={saving || !helperPick}
              onClick={addHelper}
            >
              Lisa täitja
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Juhtumid</h2>
        {profile.incidents.length === 0 ? <p className="mt-2 text-xl">Juhtumeid pole.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {profile.incidents.map((incident) => (
            <li key={incident.id} className="rounded-2xl bg-white px-4 py-3 text-xl">
              <p>{formatWhen(incident.createdAt)}</p>
              <p>
                {statusLabel(incident.status)}
                {incident.outcome ? ` · ${outcomeLabel(incident.outcome)}` : ""}
                {incident.helperName ? ` · ${incident.helperName}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="text-xl font-semibold text-[#9f1d1d]">{error}</p> : null}
    </main>
  );
}
