"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "./api";
import { ArrivalClock, isArrivalLate } from "./arrival-clock";
import { useSessionUserId } from "./app-shell";
import { useWithActor } from "./use-with-actor";
import { say, sayRepeated, setVoiceEnabled, setVoiceVolume, unlockAudio, voiceEnabled, voiceVolume, preload, type Clip } from "./voice";
import { keepAwake, release } from "./wake-lock";

type HelpView = {
  clientId: string;
  clientName: string;
  canCall: boolean;
  canCancel: boolean;
  active: {
    id: string;
    status: string;
    createdAt: string;
    helperName: string | null;
    helperEtaMin: number | null;
    acceptedAt: string | null;
    arrivedAt: string | null;
    outcome: string | null;
    outcomeNote: string | null;
    waitingLong: boolean;
  } | null;
  finished: { id: string; status: string; outcome: string | null; resolvedAt: string } | null;
};

const heardOnThisPage = new Set<string>();

function etaClip(minutes: number | null): Clip | null {
  if (minutes === 5 || minutes === 10 || minutes === 20 || minutes === 40) return `abi-teel-${minutes}`;
  return null;
}

function speakOnce(local: Set<string>, key: string, play: () => void) {
  if (local.has(key) || heardOnThisPage.has(key)) return;
  local.add(key);
  heardOnThisPage.add(key);
  play();
}

function VoiceControl() {
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    setOn(voiceEnabled());
    setVolume(voiceVolume());
  }, []);

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        className="inline-flex min-h-10 items-center rounded-xl border-2 border-ink bg-white px-3 text-base font-bold"
        type="button"
        aria-pressed={on}
        onClick={() => {
          unlockAudio();
          const next = !on;
          setVoiceEnabled(next);
          setOn(next);
        }}
      >
        {on ? "🔊 Hääl sees" : "🔇 Hääl väljas"}
      </button>
      <input
        className="h-8 min-w-0 flex-1"
        type="range"
        min={0}
        max={100}
        value={volume}
        aria-label="Helitugevus"
        onChange={(event) => {
          unlockAudio();
          const next = Number(event.target.value);
          setVoiceVolume(next);
          setVolume(next);
        }}
      />
    </div>
  );
}

const CLEAR_TRIAGE = {
  hitHead: false,
  severePainOrCantMove: false,
  bleeding: false,
  breathingOrChestPain: false,
  onFloorOverHour: false,
};

function Call112({ tall }: { tall?: boolean }) {
  return (
    <a
      className={`inline-flex w-full items-center justify-center rounded-2xl bg-danger px-5 text-xl font-bold text-white ${
        tall ? "min-h-24 text-2xl" : "min-h-16"
      }`}
      href="tel:112"
    >
      Helista 112
    </a>
  );
}

export function HelpPanel({ clientId }: { clientId: string }) {
  const userId = useSessionUserId();
  const withActor = useWithActor();
  const [view, setView] = useState<HelpView | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const heard = useRef<Set<string>>(new Set());
  const previous = useRef<{ id: string; status: string; late: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await api<HelpView>(`/api/clients/${clientId}/help`);
      if (!cancelled) {
        setView(data);
        setError("");
      }
    }

    load().catch((reason: unknown) => {
      if (cancelled) return;
      setError(reason instanceof ApiRequestError ? reason.message : "Abi-vaadet ei saanud laadida.");
    });

    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [clientId, userId]);

  useEffect(() => {
    const finished = view?.finished;
    if (!finished || finished.status !== "resolved" || view?.active) {
      setShowFarewell(false);
      return;
    }
    const left = new Date(finished.resolvedAt).getTime() + 10_000 - Date.now();
    if (left <= 0) {
      setShowFarewell(false);
      return;
    }
    setShowFarewell(true);
    const timer = window.setTimeout(() => setShowFarewell(false), left);
    return () => window.clearTimeout(timer);
  }, [view?.active, view?.finished]);

  useEffect(() => {
    if (!view?.active || view.active.status !== "helper_on_way") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [view?.active]);

  useEffect(() => {
    if (!view?.canCall) return;
    const active = view.active;
    if (!active) {
      if (previous.current) release();
      previous.current = null;
      return;
    }

    const from = active.acceptedAt || active.createdAt;
    const eta = active.helperEtaMin ?? 0;
    const late = active.status === "helper_on_way" && eta > 0 && isArrivalLate(from, eta, now);
    const prior = previous.current;
    previous.current = { id: active.id, status: active.status, late };
    if (!prior || prior.id !== active.id) return;

    if (prior.status === "open" && active.status === "helper_on_way") {
      const clip = etaClip(active.helperEtaMin);
      if (clip) speakOnce(heard.current, `${active.id}:${clip}`, () => sayRepeated(clip));
    }
    if (prior.status === "helper_on_way" && active.status === "helper_arrived") {
      speakOnce(heard.current, `${active.id}:helper_arrived`, () => sayRepeated("abistaja-kohal"));
    }
    if (active.status === "helper_on_way" && late && !prior.late) {
      speakOnce(heard.current, `${active.id}:late`, () => say("abistaja-hilineb"));
    }
    if (active.status === "resolved" || active.status === "cancelled") release();
  }, [now, view]);

  useEffect(() => () => release(), []);

  async function cancelCall() {
    if (!view?.active) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setSending(true);
    setError("");
    try {
      const data = await api<HelpView>(`/api/incidents/${view.active.id}/cancel`, { method: "POST" });
      setView(data);
      setConfirmCancel(false);
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Kutset ei saanud tühistada.");
      setConfirmCancel(false);
    } finally {
      setSending(false);
    }
  }

  async function callHelper() {
    unlockAudio();
    const clips = preload();
    keepAwake();
    setSending(true);
    setError("");
    try {
      await api(`/api/clients/${clientId}/incidents`, {
        method: "POST",
        body: JSON.stringify({ triage: CLEAR_TRIAGE }),
      });
      const data = await api<HelpView>(`/api/clients/${clientId}/help`);
      setView(data);
      await clips;
      say("kutse-saadetud");
    } catch (reason: unknown) {
      release();
      setError(reason instanceof ApiRequestError ? reason.message : "Abipalvet ei saanud saata.");
    } finally {
      setSending(false);
    }
  }

  if (error && !view) {
    return <p className="text-xl font-semibold text-danger">{error}</p>;
  }
  if (!view) {
    return <p className="text-xl">Laen…</p>;
  }

  const active = view.active;
  const coming = Boolean(
    active?.status === "helper_on_way" && active.helperEtaMin && (active.acceptedAt || active.createdAt),
  );
  const late =
    coming &&
    active &&
    isArrivalLate(active.acceptedAt || active.createdAt, active.helperEtaMin ?? 0, now);

  return (
    <main>
      <h1 className="text-4xl font-extrabold">{view.clientName}</h1>
      {view.canCall ? <VoiceControl /> : null}
      {!active && view.canCall && !showFarewell ? (
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="min-h-24 rounded-2xl bg-brand px-5 text-2xl font-bold text-white disabled:opacity-60"
            type="button"
            disabled={sending}
            onClick={callHelper}
          >
            Kutsu abistaja
          </button>
          <Call112 tall />
        </div>
      ) : null}

      {active?.status === "open" ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-2xl font-extrabold leading-snug">
            {active.waitingLong ? "Keegi ei ole veel kutset vastu võtnud." : "Kutse on saadetud. Ootame abistajat."}
          </p>
          {active.waitingLong ? (
            <p className="text-3xl font-extrabold text-danger">Helista 112</p>
          ) : null}
          <Call112 tall />
          {view.canCancel ? (
            <button
              className="min-h-16 rounded-2xl border-2 border-ink bg-white px-5 text-xl font-bold disabled:opacity-60"
              type="button"
              disabled={sending}
              onClick={() => void cancelCall()}
            >
              {confirmCancel ? "Kinnita tühistamine" : "Sain ise hakkama – tühista kutse"}
            </button>
          ) : null}
        </div>
      ) : null}

      {coming && active ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-2xl font-extrabold leading-snug">{active.helperName ?? "Abistaja"} on teel.</p>
          <p className="text-base font-semibold">Saabumiseni</p>
          <ArrivalClock from={active.acceptedAt || active.createdAt} minutes={active.helperEtaMin ?? 0} />
          {late ? (
            <p className="text-xl font-extrabold leading-snug text-danger">
              Abistaja hilineb. Kui vajad kiiresti abi, helista 112.
            </p>
          ) : null}
          <Call112 />
          {view.canCancel ? (
            <button
              className="min-h-16 rounded-2xl border-2 border-ink bg-white px-5 text-xl font-bold disabled:opacity-60"
              type="button"
              disabled={sending}
              onClick={() => void cancelCall()}
            >
              {confirmCancel ? "Kinnita tühistamine" : "Sain ise hakkama – tühista kutse"}
            </button>
          ) : null}
        </div>
      ) : null}

      {showFarewell && !active ? (
        <p className="mt-6 text-2xl font-extrabold leading-snug">Abi on lõpetatud. Hoia end!</p>
      ) : null}

      {active?.status === "helper_arrived" ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-2xl font-extrabold leading-snug">{active.helperName ?? "Abistaja"} on kohal.</p>
          <Call112 />
        </div>
      ) : null}

      {active?.status === "escalated_112" ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-2xl font-extrabold leading-snug">See võib olla terviseoht.</p>
          <Call112 tall />
        </div>
      ) : null}

      {!view.canCall && !active ? (
        <p className="mt-4 text-xl">Sina saad seda klienti vaadata. Abi kutsub abisaaja.</p>
      ) : null}

      {error ? <p className="mt-4 text-xl font-semibold text-danger">{error}</p> : null}

      {!view.canCall ? (
        <Link className="mt-6 inline-block text-xl font-bold underline" href={withActor(`/kliendid/${clientId}`)}>
          Profiil
        </Link>
      ) : null}
    </main>
  );
}
