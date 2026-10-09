"use client";

import Link from "next/link";
import { useState } from "react";
import { ID } from "@/backend/ids";
import { Logo } from "./ui/logo";

type Viewer = {
  label: string;
  src: string;
};

type Phone = {
  title: string;
  width: string;
  viewers: Viewer[];
};

const PHONES: Phone[] = [
  {
    title: "Abisaaja",
    width: "22rem",
    viewers: [
      { label: "Helgi Tamm", src: `/kliendid/${ID.clientHelgi}/abi?as=${ID.helgi}&tone=client` },
      { label: "Aino Levin", src: `/kliendid/${ID.clientAino}/abi?as=${ID.aino}&tone=client` },
      { label: "Lembit Kask", src: `/kliendid/${ID.clientLembit}/abi?as=${ID.lembit}&tone=client` },
    ],
  },
  {
    title: "Täitja",
    width: "23rem",
    viewers: [
      { label: "Jüri Mets", src: `/taitjad?as=${ID.juri}&tone=helper` },
      { label: "Mari Tamm", src: `/taitjad?as=${ID.mari}&tone=helper` },
      { label: "Liis Kask", src: `/taitjad?as=${ID.liis}&tone=helper` },
      { label: "Peeter Org", src: `/taitjad?as=${ID.peeter}&tone=helper` },
    ],
  },
  {
    title: "Lähedane",
    width: "24rem",
    viewers: [
      {
        label: "Mari Tamm",
        src: `/kliendid/${ID.clientHelgi}?as=${ID.mari}&tone=client`,
      },
      {
        label: "Kalle Saar",
        src: `/kliendid/${ID.clientHelgi}?as=${ID.kalle}&tone=client`,
      },
      { label: "Anna Admin", src: `/admin?as=${ID.anna}&tone=admin` },
      { label: "Eva KOV", src: `/admin?as=${ID.eva}&tone=admin` },
    ],
  },
];

const PUBLIC_PIN = process.env.NEXT_PUBLIC_DEMO_PIN ?? "";

function savedPin() {
  if (PUBLIC_PIN) return PUBLIC_PIN;
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("uppis_demo_pin") ?? "";
}

export function DemoStage() {
  const [picked, setPicked] = useState(() => PHONES.map(() => 0));
  const [mobileTab, setMobileTab] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function resetDemo() {
    const code = savedPin() || pin.trim();
    if (!code) {
      setAskPin(true);
      setError("");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      setError("");
      return;
    }
    setSending(true);
    setError("");
    try {
      const headers = {
        "content-type": "application/json",
        "x-uppis-user": ID.anna,
      };
      const pinResponse = await fetch("/api/admin/pin", {
        method: "POST",
        headers,
        body: JSON.stringify({ pin: code }),
      });
      const pinBody = (await pinResponse.json().catch(() => ({}))) as { error?: string };
      if (!pinResponse.ok) throw new Error(pinBody.error || "Vale PIN");
      if (!PUBLIC_PIN) window.sessionStorage.setItem("uppis_demo_pin", code);
      const resetResponse = await fetch("/api/admin/reset", { method: "POST", headers });
      const resetBody = (await resetResponse.json().catch(() => ({}))) as { error?: string };
      if (!resetResponse.ok) throw new Error(resetBody.error || "Lähtestamine ebaõnnestus.");
      setGeneration((current) => current + 1);
      setConfirming(false);
      setAskPin(false);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Lähtestamine ebaõnnestus.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-stage px-3 py-3 text-white max-lg:pb-16 lg:overflow-hidden lg:px-4 xl:px-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo variant="dark" height={40} />
          <p className="text-sm text-[#C9D1D9]">Kiire abi, kui kukkusid kodus.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {askPin && !PUBLIC_PIN ? (
            <input
              className="min-h-11 w-24 rounded-lg border border-white/40 bg-stage px-2 text-sm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Demo PIN"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                setConfirming(false);
              }}
            />
          ) : null}
          <button
            className="inline-flex min-h-11 items-center rounded-pill border border-brand-light px-3 text-sm font-semibold text-brand-light disabled:opacity-40"
            type="button"
            disabled={sending}
            onClick={() => void resetDemo()}
          >
            {confirming ? "Kinnita lähtestamine" : "Lähtesta demo"}
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-semibold text-white underline-offset-4 hover:underline" href="/valik">
            Ava eraldi
          </Link>
        </div>
      </header>
      {error ? <p className="mt-2 text-sm font-semibold text-danger-soft">{error}</p> : null}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 items-start lg:grid-cols-3 lg:gap-3 xl:gap-6">
        {PHONES.map((phone, index) => {
          const viewer = phone.viewers[picked[index]] ?? phone.viewers[0];
          return (
            <section
              key={phone.title}
              className={`${mobileTab === index ? "flex" : "hidden"} min-w-0 flex-col items-center lg:flex`}
            >
              <p className="hidden text-xs font-semibold tracking-wide text-brand-light lg:block">{phone.title.toUpperCase()}</p>
              <p className="hidden text-base font-semibold text-white lg:block">{viewer.label}</p>
              <label className="mt-1 text-xs text-white/80" htmlFor={`viewer-${index}`}>
                Vaata kui…
                <select
                  id={`viewer-${index}`}
                  className="mt-1 block max-w-full rounded-lg border border-white/30 bg-stage px-2 py-1 text-sm text-white"
                  value={viewer.src}
                  onChange={(event) => {
                    const next = phone.viewers.findIndex((item) => item.src === event.target.value);
                    setPicked((current) => current.map((choice, choiceIndex) => (choiceIndex === index ? next : choice)));
                  }}
                >
                  {phone.viewers.map((item) => (
                    <option key={item.src} value={item.src}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="relative mt-2 w-full max-lg:h-[calc(100dvh-9rem)] lg:h-[min(78dvh,780px)] lg:max-w-[300px] lg:border lg:border-[#2b3038] lg:bg-[#1d2127] lg:p-[1.15rem_0.55rem_0.7rem] lg:shadow-[0_24px_60px_rgba(0,0,0,0.45)] xl:max-w-[var(--phone-width)] lg:rounded-[2.6rem]"
                style={{ ["--phone-width" as string]: phone.width }}
              >
                <div className="absolute left-1/2 top-2 z-10 hidden h-4 w-24 -translate-x-1/2 rounded-pill bg-black lg:block" />
                <iframe
                  key={`${generation}-${viewer.src}`}
                  title={`${phone.title}, ${viewer.label}`}
                  src={viewer.src}
                  allow="autoplay; screen-wake-lock"
                  className="relative z-10 h-full w-full border-0 bg-bg lg:rounded-[1.9rem]"
                />
              </div>
            </section>
          );
        })}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-3 bg-stage lg:hidden" aria-label="Vaated">
        {PHONES.map((phone, index) => (
          <button
            key={phone.title}
            className={`text-base font-bold ${mobileTab === index ? "text-brand-light underline decoration-2 underline-offset-8" : "text-[#C9D1D9]"}`}
            type="button"
            aria-current={mobileTab === index ? "page" : undefined}
            onClick={() => setMobileTab(index)}
          >
            {phone.title}
          </button>
        ))}
      </nav>
    </main>
  );
}
