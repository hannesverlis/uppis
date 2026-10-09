"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useEmbedded, usePageTitle, useSessionUserId } from "./app-shell";
import { ArrivalClock } from "./arrival-clock";
import { CLOSE_OPTIONS, formatClock, statusLabel } from "./labels";
import { Avatar } from "./ui/avatar";
import { BottomSheet } from "./ui/bottom-sheet";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { MapBackdrop } from "./ui/map-backdrop";
import { StatusPill } from "./ui/status-pill";

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
  waitingTooLong: boolean;
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

function RequestClock({ from, late }: { from: string; late?: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className={`text-xl font-bold tabular-nums ${late ? "text-danger" : "text-ink"}`} aria-live="polite">
      {elapsedText(from, now)}
    </p>
  );
}

export function HelperQueue() {
  const userId = useSessionUserId();
  const embedded = useEmbedded();
  const [items, setItems] = useState<IncidentDetail[] | null>(null);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState("");
  const [closingId, setClosingId] = useState("");
  const [otherId, setOtherId] = useState("");
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [arrivingId, setArrivingId] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [conflict, setConflict] = useState<{ id: string; message: string } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  usePageTitle("Kutsed");

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

  useEffect(() => {
    if (!items) return;
    if (!primed.current) {
      items.forEach((item) => seen.current.add(item.id));
      primed.current = true;
      return;
    }
    const arrived = items.filter((item) => !seen.current.has(item.id)).map((item) => item.id);
    arrived.forEach((id) => seen.current.add(id));
    if (arrived.length > 0) setFresh(new Set(arrived));
  }, [items]);

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
    setConflict(null);
    try {
      await api(`/api/incidents/${incidentId}/accept`, {
        method: "POST",
        body: JSON.stringify({ etaMin }),
      });
      const queue = await api<QueueItem[]>("/api/helpers/queue");
      const details = await Promise.all(queue.map((item) => api<IncidentDetail>(`/api/incidents/${item.id}`)));
      setItems(details);
    } catch (reason: unknown) {
      if (reason instanceof ApiRequestError && reason.status === 409) {
        try {
          await reload();
        } catch {
          setItems([]);
        }
        setConflict({ id: incidentId, message: reason.message });
        setError(reason.message);
        return;
      }
      setError(reason instanceof ApiRequestError ? reason.message : "Kutset ei saanud vastu võtta.");
    } finally {
      setAcceptingId("");
    }
  }

  const sorted = [...(items ?? [])].sort((a, b) => {
    const mine = (item: IncidentDetail) => Number(item.canMarkArrived || item.canClose);
    return mine(b) - mine(a);
  });
  const closingItem = sorted.find((item) => item.id === closingId) ?? null;

  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        {embedded ? <h1 className="text-2xl font-bold">Kutsed</h1> : <span />}
        <StatusPill status="open" label={items ? String(items.length) : "…"} />
      </div>
      {error && !conflict ? <p className="mb-4 text-base font-semibold text-danger">{error}</p> : null}
      {!error && !items ? <p className="text-base">Laen abipalveid…</p> : null}
      {items && items.length === 0 && !error ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <img src="/brand/uppis-mark.svg" alt="" className="h-24 w-24 opacity-30 grayscale" />
          <p className="mt-4 text-base text-ink">Praegu kutseid pole. Anname teada, kui keegi vajab abi.</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {sorted.map((item) => {
          const mine = item.canMarkArrived || item.canClose;
          const taken = item.status === "helper_on_way" && item.helperName && !item.canAccept && !item.canMarkArrived;
          if (item.status === "cancelled") {
            return (
              <Card key={item.id}>
                <p className="text-xl font-bold leading-snug">Kutse tühistati abisaaja poolt</p>
              </Card>
            );
          }
          return (
            <Card key={item.id} fresh={fresh.has(item.id)} className={`${taken ? "opacity-60" : ""} ${item.waitingTooLong ? "border-l-4 border-l-danger" : ""}`}>
              {mine && (item.status === "helper_on_way" || item.status === "helper_arrived") ? (
                <MapBackdrop helperName={item.status === "helper_on_way" ? item.helperName : null} className="mb-3 h-[140px] rounded-card" />
              ) : null}
              <div className="flex items-center gap-3">
                <Avatar name={item.clientName} size={40} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{item.clientName}</h2>
                  <p className="text-sm text-ink-muted">{item.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-ink-muted">Abipalvest</p>
                  <RequestClock from={item.createdAt} late={item.waitingTooLong} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill status={item.status} label={statusLabel(item.status)} />
                {item.waitingTooLong ? <StatusPill status="escalated_112" label="Ootab üle 10 min" /> : null}
              </div>
              {item.municipalityName ? <p className="mt-2 text-sm text-ink-muted">{item.municipalityName}</p> : null}
              {item.clientPhone ? <p className="text-base">{item.clientPhone}</p> : null}
              {item.accessNotes ? <p className="mt-2 text-base">{item.accessNotes}</p> : null}
              {taken ? (
                <p className="mt-3 text-base font-semibold text-ink-muted">
                  Kutse võttis juba vastu {item.helperName}. {item.helperName} on teel
                  {item.helperEtaMin ? `, ETA ${item.helperEtaMin} min` : ""}.
                </p>
              ) : null}
              {conflict?.id === item.id ? (
                <p className="mt-3 rounded-card bg-danger-soft px-3 py-2 text-base font-semibold text-danger">{conflict.message}</p>
              ) : null}
              {mine && item.status === "helper_on_way" && item.helperEtaMin ? (
                <div className="mt-3">
                  <ArrivalClock from={item.acceptedAt || item.createdAt} minutes={item.helperEtaMin} />
                </div>
              ) : null}
              {item.status === "helper_arrived" && item.arrivedAt ? (
                <p className="mt-3 text-base font-bold">Kohal alates {formatClock(item.arrivedAt)}</p>
              ) : null}
              {item.canMarkArrived ? (
                <Button className="mt-4" size="md" disabled={arrivingId === item.id} onClick={() => void markHere(item.id)}>
                  Olen kohal
                </Button>
              ) : null}
              {item.canClose ? (
                <Button className="mt-3" variant="secondary" size="md" onClick={() => {
                  setClosingId(item.id);
                  setOtherId("");
                  setNote("");
                }}>
                  Lõpeta juhtum
                </Button>
              ) : null}
              {item.canAccept ? (
                <>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {ETA_MINUTES.map((minutes) => (
                      <button
                        key={minutes}
                        className={`min-h-11 rounded-pill px-1 text-sm font-semibold ${
                          picked[item.id] === minutes ? "bg-brand text-white" : "bg-surface text-ink"
                        }`}
                        type="button"
                        onClick={() => setPicked((current) => ({ ...current, [item.id]: minutes }))}
                      >
                        {minutes} min
                      </button>
                    ))}
                  </div>
                  <Button
                    className="mt-3"
                    size="md"
                    disabled={!picked[item.id] || acceptingId === item.id}
                    onClick={() => accept(item.id, picked[item.id])}
                  >
                    Võtan vastu
                  </Button>
                </>
              ) : null}
            </Card>
          );
        })}
      </div>
      {closingItem ? (
        <BottomSheet className="z-50" label="Lõpeta juhtum">
          <h2 className="text-xl font-bold">Lõpeta juhtum</h2>
          <div className="mt-3 flex flex-col gap-2">
            {CLOSE_OPTIONS.map((option) => (
              <Button
                key={option.outcome}
                variant="secondary"
                size="md"
                disabled={closing}
                onClick={() => {
                  if (option.outcome === "other") {
                    setOtherId(closingItem.id);
                    return;
                  }
                  void closeIncident(closingItem.id, option.outcome);
                }}
              >
                {option.label}
              </Button>
            ))}
            {otherId === closingItem.id ? (
              <>
                <label className="text-base font-semibold" htmlFor={`note-${closingItem.id}`}>
                  Märkus
                </label>
                <textarea
                  id={`note-${closingItem.id}`}
                  className="min-h-24 rounded-card border border-border bg-surface px-3 py-2 text-base"
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <Button size="md" disabled={closing} onClick={() => void closeIncident(closingItem.id, "other")}>
                  Lõpeta
                </Button>
              </>
            ) : null}
            <button type="button" className="min-h-11 text-base font-semibold text-brand" onClick={() => setClosingId("")}>
              Sulge
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );
}
