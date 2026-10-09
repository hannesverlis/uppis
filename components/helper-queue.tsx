"use client";

import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { ArrivalClock } from "./arrival-clock";
import { useSessionUserId } from "./app-shell";
import { CLOSE_OPTIONS, formatClock, statusLabel } from "./labels";

type QueueItem = {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  municipalityName: string;
  createdAt: string;
  status: string;
  helperName: string | null;
  helperEtaMin: number | null;
};

type IncidentDetail = QueueItem & {
  clientPhone: string | null;
  accessNotes: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  canAccept: boolean;
  canMarkArrived: boolean;
  canClose: boolean;
};

const ETA_MINUTES = [5, 10, 20, 40];

function elapsedText(from: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const clock = [minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
  return hours > 0 ? `${hours}:${clock}` : clock;
}

function RequestClock({ from }: { from: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="text-4xl font-extrabold tabular-nums" aria-live="polite">
      {elapsedText(from, now)}
    </p>
  );
}

export function HelperQueue() {
  const userId = useSessionUserId();
  const [items, setItems] = useState<IncidentDetail[] | null>(null);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState("");
  const [closingId, setClosingId] = useState("");
  const [otherId, setOtherId] = useState("");
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [arrivingId, setArrivingId] = useState("");

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setError("Vali abistaja.");
      return;
    }

    let cancelled = false;

    async function load() {
      const queue = await api<QueueItem[]>("/api/helpers/queue");
      const details = await Promise.all(
        queue.map((item) => api<IncidentDetail>(`/api/incidents/${item.id}`)),
      );
      if (!cancelled) {
        setItems(details);
        setError("");
      }
    }

    load().catch((reason: unknown) => {
      if (cancelled) return;
      setItems([]);
      setError(reason instanceof ApiRequestError ? reason.message : "Abipalveid ei saanud laadida.");
    });

    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId]);

  async function reload() {
    const queue = await api<QueueItem[]>("/api/helpers/queue");
    const details = await Promise.all(queue.map((item) => api<IncidentDetail>(`/api/incidents/${item.id}`)));
    setItems(details);
    setError("");
  }

  async function closeIncident(incidentId: string, outcome: string) {
    setClosing(true);
    setError("");
    try {
      await api(`/api/incidents/${incidentId}/close`, {
        method: "POST",
        body: JSON.stringify({ outcome, outcomeNote: outcome === "other" ? note : "" }),
      });
      setClosingId("");
      setOtherId("");
      setNote("");
      await reload();
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Juhtumit ei saanud lõpetada.");
    } finally {
      setClosing(false);
    }
  }

  async function markHere(incidentId: string) {
    setArrivingId(incidentId);
    setError("");
    try {
      await api(`/api/incidents/${incidentId}/arrived`, { method: "POST" });
      await reload();
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Kohalolekut ei saanud märkida.");
    } finally {
      setArrivingId("");
    }
  }

  async function accept(incidentId: string, etaMin: number) {
    setAcceptingId(incidentId);
    setError("");
    try {
      await api(`/api/incidents/${incidentId}/accept`, {
        method: "POST",
        body: JSON.stringify({ etaMin }),
      });
      const queue = await api<QueueItem[]>("/api/helpers/queue");
      const details = await Promise.all(queue.map((item) => api<IncidentDetail>(`/api/incidents/${item.id}`)));
      setItems(details);
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Kutset ei saanud vastu võtta.");
    } finally {
      setAcceptingId("");
    }
  }

  return (
    <main>
      <h1 className="text-3xl font-extrabold">Abipalved</h1>
      {error ? <p className="mt-4 text-xl font-semibold text-[#9f1d1d]">{error}</p> : null}
      {!error && !items ? <p className="mt-4 text-xl">Laen abipalveid…</p> : null}
      {items && items.length === 0 && !error ? (
        <p className="mt-4 text-xl">Aktiivseid abipalveid pole.</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3">
        {items?.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white px-5 py-4">
            <p className="text-base font-semibold">Abipalvest</p>
            <RequestClock from={item.createdAt} />
            <h2 className="mt-3 text-2xl font-extrabold">{item.clientName}</h2>
            <p className="mt-1 text-xl">{item.address}</p>
            <p className="text-xl">{item.municipalityName}</p>
            {item.clientPhone ? <p className="text-xl">{item.clientPhone}</p> : null}
            {item.accessNotes ? <p className="mt-2 text-xl">{item.accessNotes}</p> : null}
            <p className="mt-2 text-base">{statusLabel(item.status)}</p>
            {item.status === "helper_on_way" && item.helperEtaMin ? (
              <div className="mt-3">
                <p className="text-base font-semibold">Saabumiseni</p>
                <ArrivalClock from={item.acceptedAt || item.createdAt} minutes={item.helperEtaMin} />
              </div>
            ) : null}
            {item.status === "helper_arrived" && item.arrivedAt ? (
              <p className="mt-3 text-xl font-extrabold">Kohal alates {formatClock(item.arrivedAt)}</p>
            ) : null}
            {item.canMarkArrived ? (
              <button
                className="mt-4 min-h-16 w-full rounded-2xl bg-[#0c6b52] px-3 text-xl font-bold text-white disabled:opacity-60"
                type="button"
                disabled={arrivingId === item.id}
                onClick={() => void markHere(item.id)}
              >
                Olen kohal
              </button>
            ) : null}
            {item.canClose ? (
              closingId === item.id ? (
                <div className="mt-4 flex flex-col gap-2">
                  {CLOSE_OPTIONS.map((option) => (
                    <button
                      key={option.outcome}
                      className="min-h-16 rounded-2xl bg-[#16324f] px-3 text-xl font-bold text-white disabled:opacity-60"
                      type="button"
                      disabled={closing}
                      onClick={() => {
                        if (option.outcome === "other") {
                          setOtherId(item.id);
                          return;
                        }
                        void closeIncident(item.id, option.outcome);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                  {otherId === item.id ? (
                    <>
                      <label className="text-base font-semibold" htmlFor={`note-${item.id}`}>
                        Märkus
                      </label>
                      <textarea
                        id={`note-${item.id}`}
                        className="min-h-24 rounded-2xl border-2 border-[#1c1915] px-3 py-2 text-xl"
                        maxLength={500}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                      <button
                        className="min-h-16 rounded-2xl bg-[#16324f] px-3 text-xl font-bold text-white disabled:opacity-60"
                        type="button"
                        disabled={closing}
                        onClick={() => void closeIncident(item.id, "other")}
                      >
                        Lõpeta
                      </button>
                    </>
                  ) : null}
                </div>
              ) : (
                <button
                  className="mt-4 min-h-16 w-full rounded-2xl bg-[#16324f] px-3 text-xl font-bold text-white"
                  type="button"
                  onClick={() => {
                    setClosingId(item.id);
                    setOtherId("");
                    setNote("");
                  }}
                >
                  Lõpeta juhtum
                </button>
              )
            ) : null}
            {item.canAccept ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ETA_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    className="min-h-16 rounded-2xl bg-[#0c6b52] px-3 text-xl font-bold text-white disabled:opacity-60"
                    type="button"
                    disabled={acceptingId === item.id}
                    onClick={() => accept(item.id, minutes)}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
