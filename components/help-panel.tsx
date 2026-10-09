"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { ArrivalClock } from "./arrival-clock";
import { useSessionUserId } from "./app-shell";

type HelpView = {
  clientId: string;
  clientName: string;
  canCall: boolean;
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
      className={`inline-flex w-full items-center justify-center rounded-2xl bg-[#9f1d1d] px-5 text-xl font-bold text-white ${
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
  const [view, setView] = useState<HelpView | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);

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
    if (!finished || view?.active) {
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

  async function callHelper() {
    setSending(true);
    setError("");
    try {
      await api(`/api/clients/${clientId}/incidents`, {
        method: "POST",
        body: JSON.stringify({ triage: CLEAR_TRIAGE }),
      });
      const data = await api<HelpView>(`/api/clients/${clientId}/help`);
      setView(data);
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Abipalvet ei saanud saata.");
    } finally {
      setSending(false);
    }
  }

  if (error && !view) {
    return <p className="text-xl font-semibold text-[#9f1d1d]">{error}</p>;
  }
  if (!view) {
    return <p className="text-xl">Laen…</p>;
  }

  const active = view.active;
  const coming = active?.status === "helper_on_way" && active.helperEtaMin && (active.acceptedAt || active.createdAt);

  return (
    <main>
      <h1 className="text-4xl font-extrabold">{view.clientName}</h1>
      {!active && view.canCall && !showFarewell ? (
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="min-h-24 rounded-2xl bg-[#0c6b52] px-5 text-2xl font-bold text-white disabled:opacity-60"
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
          <Call112 tall />
        </div>
      ) : null}

      {coming && active ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-2xl font-extrabold leading-snug">{active.helperName ?? "Abistaja"} on teel.</p>
          <p className="text-base font-semibold">Saabumiseni</p>
          <ArrivalClock from={active.acceptedAt || active.createdAt} minutes={active.helperEtaMin ?? 0} />
          <Call112 />
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

      {error ? <p className="mt-4 text-xl font-semibold text-[#9f1d1d]">{error}</p> : null}

      {!view.canCall ? (
        <Link className="mt-6 inline-block text-xl font-bold underline" href={`/kliendid/${clientId}`}>
          Profiil
        </Link>
      ) : null}
    </main>
  );
}
