"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "./api";
import { ArrivalClock, isArrivalLate } from "./arrival-clock";
import { useSessionUserId } from "./app-shell";
import { useWithActor } from "./use-with-actor";
import { formatClock } from "./labels";
import { say, sayRepeated, setVoiceEnabled, setVoiceVolume, unlockAudio, voiceEnabled, voiceVolume, preload, type Clip } from "./voice";
import { keepAwake, release } from "./wake-lock";
import { BottomSheet } from "./ui/bottom-sheet";
import { Button } from "./ui/button";
import { CheckIcon, MarkIcon, PhoneIcon, SpeakerIcon } from "./ui/icons";
import { MapBackdrop } from "./ui/map-backdrop";
import { StatusPill } from "./ui/status-pill";
import { Avatar } from "./ui/avatar";

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

function arrivesAt(from: string, minutes: number) {
  return new Date(new Date(from).getTime() + minutes * 60_000).toISOString();
}

function VoiceControl() {
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(70);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOn(voiceEnabled());
    setVolume(voiceVolume());
  }, []);

  return (
    <>
      <button
        className="fixed top-4 right-[4.75rem] z-40 flex h-11 w-11 items-center justify-center bg-white text-ink shadow-card"
        style={{ borderRadius: "var(--radius-icon)" }}
        type="button"
        aria-pressed={on}
        aria-label={on ? "Hääl sees" : "Hääl väljas"}
        onClick={() => {
          unlockAudio();
          setOpen(true);
        }}
      >
        <SpeakerIcon muted={!on} className="h-6 w-6" />
      </button>
      {open ? (
        <BottomSheet className="z-50" label="Helitugevus">
          <Button
            variant={on ? "primary" : "secondary"}
            size="elder"
            onClick={() => {
              unlockAudio();
              const next = !on;
              setVoiceEnabled(next);
              setOn(next);
            }}
          >
            {on ? "Hääl sees" : "Hääl väljas"}
          </Button>
          <label className="mt-4 block text-xl font-semibold" htmlFor="voice-volume">
            Helitugevus
            <input
              id="voice-volume"
              className="mt-3 h-11 w-full"
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
          </label>
          <button type="button" className="mt-4 min-h-11 text-base font-semibold text-brand" onClick={() => setOpen(false)}>
            Sulge
          </button>
        </BottomSheet>
      ) : null}
    </>
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
      className={`inline-flex w-full items-center justify-center gap-3 rounded-pill bg-danger px-5 font-semibold text-white active:scale-[0.98] ${
        tall ? "min-h-[72px] text-[22px]" : "min-h-16 text-xl"
      }`}
      href="tel:112"
    >
      <PhoneIcon className="h-6 w-6" />
      Helista 112
    </a>
  );
}

export function HelpPanel({ clientId }: { clientId: string }) {
  const userId = useSessionUserId();
  const withActor = useWithActor();
  const [view, setView] = useState<HelpView | null>(null);
  const [address, setAddress] = useState("");
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
    let cancelled = false;
    api<{ address?: string }>(`/api/clients/${clientId}`)
      .then((data) => {
        if (!cancelled && data.address) setAddress(data.address);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
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
    return <p className="px-5 pt-8 text-xl">Laen…</p>;
  }

  const active = view.active;
  const first = view.clientName.split(" ")[0] || view.clientName;
  const coming = Boolean(
    active?.status === "helper_on_way" && active.helperEtaMin && (active.acceptedAt || active.createdAt),
  );
  const late =
    coming &&
    active &&
    isArrivalLate(active.acceptedAt || active.createdAt, active.helperEtaMin ?? 0, now);

  if (showFarewell && !active && view.canCall) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex w-full max-w-[480px] flex-col items-center justify-center bg-brand px-6 text-center text-white">
        <span className="flex h-24 w-24 items-center justify-center bg-white text-brand" style={{ borderRadius: "var(--radius-icon)" }}>
          <CheckIcon className="h-12 w-12" />
        </span>
        <p className="mt-6 text-[26px] font-bold">Abi on lõpetatud. Hoia end!</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      {view.canCall ? <VoiceControl /> : null}
      <MapBackdrop
        searching={active?.status === "open"}
        helperName={coming ? active?.helperName : null}
      />
      <BottomSheet className={active?.status === "helper_arrived" ? "bg-brand-soft" : ""}>
        {!active && view.canCall ? (
          <>
            <h1 className="text-[26px] font-bold">Tere, {first}</h1>
            {address ? <p className="mt-1 text-xl">{address}</p> : null}
            <Button className="mt-5" size="tall" disabled={sending} onClick={callHelper}>
              <MarkIcon className="h-7 w-7" />
              Kutsu abistaja
            </Button>
            <div className="mt-3">
              <Call112 tall />
            </div>
          </>
        ) : null}

        {active?.status === "open" ? (
          <div className="flex flex-col gap-3">
            <StatusPill status="open" />
            {active.waitingLong ? (
              <p className="rounded-card bg-warning-soft px-4 py-3 text-xl font-semibold text-warning-ink">
                Keegi ei ole veel kutset vastu võtnud.
              </p>
            ) : (
              <p className="text-[22px] font-bold leading-snug">Kutse on saadetud. Ootame abistajat.</p>
            )}
            {active.waitingLong ? null : (
              <p className="text-[22px] font-bold tracking-widest text-brand" aria-hidden="true">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </p>
            )}
            <Call112 tall={active.waitingLong} />
            {view.canCancel ? (
              <Button variant="secondary" size="elder" disabled={sending} onClick={() => void cancelCall()}>
                {confirmCancel ? "Kinnita tühistamine" : "Sain ise hakkama – tühista kutse"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {coming && active ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={active.helperName ?? "Abistaja"} size={56} />
              <div>
                <p className="text-2xl font-bold">{active.helperName ?? "Abistaja"}</p>
                <StatusPill status="helper_on_way" />
              </div>
            </div>
            <ArrivalClock from={active.acceptedAt || active.createdAt} minutes={active.helperEtaMin ?? 0} large />
            <p className="text-xl">
              {late ? "Hilineb" : `Saabub umbes ${formatClock(arrivesAt(active.acceptedAt || active.createdAt, active.helperEtaMin ?? 0))}`}
            </p>
            {late ? (
              <p className="text-xl font-semibold text-danger">Abistaja hilineb. Kui vajad kiiresti abi, helista 112.</p>
            ) : null}
            {view.canCancel ? (
              <Button variant="secondary" size="elder" disabled={sending} onClick={() => void cancelCall()}>
                {confirmCancel ? "Kinnita tühistamine" : "Sain ise hakkama – tühista kutse"}
              </Button>
            ) : null}
            <Call112 />
          </div>
        ) : null}

        {active?.status === "helper_arrived" ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-20 w-20 items-center justify-center bg-brand text-white" style={{ borderRadius: "var(--radius-icon)" }}>
              <CheckIcon className="h-10 w-10" />
            </span>
            <p className="text-[26px] font-bold text-brand">{active.helperName ?? "Abistaja"} on kohal.</p>
            <Call112 />
          </div>
        ) : null}

        {active?.status === "escalated_112" ? (
          <div className="flex flex-col gap-3">
            <StatusPill status="escalated_112" />
            <p className="text-[22px] font-bold leading-snug">See võib olla terviseoht.</p>
            <Call112 tall />
          </div>
        ) : null}

        {!view.canCall && !active ? (
          <p className="text-xl">Sina saad seda klienti vaadata. Abi kutsub abisaaja.</p>
        ) : null}

        {error ? <p className="mt-4 text-xl font-semibold text-danger">{error}</p> : null}

        {!view.canCall ? (
          <Link className="mt-4 inline-block text-xl font-bold text-brand underline" href={withActor(`/kliendid/${clientId}`)}>
            Profiil
          </Link>
        ) : null}
      </BottomSheet>
    </div>
  );
}
