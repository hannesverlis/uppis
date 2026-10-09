"use client";

import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useSessionUserId } from "./app-shell";
import { formatWhen, kovStatusLabel, outcomeLabel, statusLabel } from "./labels";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type Session = {
  me: { id: string; roles: string[] } | null;
};

type KovIncident = {
  id: string;
  clientName: string;
  address: string;
  createdAt: string;
  status: string;
  helperName: string | null;
  outcome: string | null;
  kovStatus: string;
  kovConsent: boolean;
};

type RepeatFaller = {
  clientId: string;
  name: string;
  address: string;
  falls30d: number;
  kovConsent: boolean;
};

type KovData = {
  repeatFallers: RepeatFaller[];
  incidents: KovIncident[];
};

const ACTIVE = new Set(["open", "escalated_112", "helper_on_way", "helper_arrived"]);

export function KovPanel() {
  const userId = useSessionUserId();
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<KovData | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Session>("/api/bootstrap")
      .then((session) => {
        if (!cancelled) setAllowed(Boolean(session.me?.roles.includes("admin_kov")));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;

    async function load() {
      try {
        const next = await readKov();
        if (!cancelled) {
          setData(next);
          setError("");
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(reason instanceof ApiRequestError ? reason.message : "Juhtumeid ei saanud laadida.");
        }
      }
    }

    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [allowed, userId]);

  if (!allowed) return null;

  async function takeCase(incidentId: string) {
    setBusyId(incidentId);
    setError("");
    try {
      await api(`/api/admin/kov/${incidentId}`, {
        method: "POST",
        body: JSON.stringify({ kovStatus: "in_progress" }),
      });
      setData(await readKov());
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Olekut ei saanud muuta.");
    } finally {
      setBusyId("");
    }
  }

  const incidents = [...(data?.incidents ?? [])].sort((a, b) => {
    const active = Number(ACTIVE.has(b.status)) - Number(ACTIVE.has(a.status));
    if (active !== 0) return active;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <section className="mt-6">
      <h2 className="text-base font-bold">Omavalitsuse juhtumid</h2>
      <p className="mt-2 text-base leading-relaxed">
        Näed oma linna juhtumeid. Teise omavalitsuse read jäävad peitu.
      </p>
      {data && data.repeatFallers.length > 0 ? (
        <Card className="mt-4">
          <h3 className="text-base font-bold">Korduvkukkujad</h3>
          <ul className="mt-3 space-y-3">
            {data.repeatFallers.map((person) => (
              <li key={person.clientId} className="text-base leading-relaxed">
                <span className="font-bold">{person.name}</span>
                {` · ${person.falls30d} korda 30 päeva jooksul`}
                <span className="block">{person.address}</span>
                {person.kovConsent ? null : <span className="block font-semibold">Nõusolekut pole</span>}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {incidents.length === 0 && !error ? <p className="mt-4 text-base">Juhtumeid pole.</p> : null}
      <div className="mt-4 space-y-3">
        {incidents.map((incident) => (
          <Card key={incident.id}>
            <p className="text-base font-bold">{incident.clientName}</p>
            <p className="mt-1 text-base text-ink-muted">{incident.address}</p>
            <p className="mt-2 text-base">
              {statusLabel(incident.status)}
              {incident.helperName ? ` · ${incident.helperName}` : ""}
            </p>
            <p className="mt-1 text-base">{formatWhen(incident.createdAt)}</p>
            {incident.outcome ? <p className="mt-1 text-base">{outcomeLabel(incident.outcome)}</p> : null}
            <p className="mt-1 text-base font-semibold">
              {incident.kovConsent ? kovStatusLabel(incident.kovStatus) : "Nõusolekut pole"}
            </p>
            {incident.kovConsent && incident.kovStatus === "new" ? (
              <Button className="mt-3" size="admin" disabled={busyId === incident.id} onClick={() => takeCase(incident.id)}>
                Võta menetlusse
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
      {error ? <p className="mt-3 text-base font-semibold text-danger">{error}</p> : null}
    </section>
  );
}

async function readKov(): Promise<KovData> {
  try {
    return await api<KovData>("/api/admin/kov");
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    const pin = process.env.NEXT_PUBLIC_DEMO_PIN;
    if (!pin) throw error;
    await api("/api/admin/pin", { method: "POST", body: JSON.stringify({ pin }) });
    return api<KovData>("/api/admin/kov");
  }
}
