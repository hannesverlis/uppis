"use client";

import Link from "next/link";
import { useState } from "react";
import { ID } from "@/backend/ids";

type Viewer = {
  label: string;
  src: string;
};

type Phone = {
  title: string;
  bezel: string;
  label: string;
  radius: string;
  inner: string;
  width: string;
  padding: string;
  viewers: Viewer[];
};

const PHONES: Phone[] = [
  {
    title: "Abisaaja",
    bezel: "#143d32",
    label: "#b7e4cf",
    radius: "2.6rem",
    inner: "1.9rem",
    width: "22rem",
    padding: "1.45rem 0.7rem 0.85rem",
    viewers: [
      { label: "Helgi Tamm", src: `/kliendid/${ID.clientHelgi}/abi?as=${ID.helgi}&tone=client` },
      { label: "Aino Levin", src: `/kliendid/${ID.clientAino}/abi?as=${ID.aino}&tone=client` },
      { label: "Lembit Kask", src: `/kliendid/${ID.clientLembit}/abi?as=${ID.lembit}&tone=client` },
    ],
  },
  {
    title: "Täitja",
    bezel: "#16324f",
    label: "#c5ddf5",
    radius: "1.7rem",
    inner: "1.15rem",
    width: "23rem",
    padding: "1.25rem 0.45rem 0.7rem",
    viewers: [
      { label: "Jüri Mets", src: `/taitjad?as=${ID.juri}&tone=helper` },
      { label: "Mari Tamm", src: `/taitjad?as=${ID.mari}&tone=helper` },
      { label: "Liis Kask", src: `/taitjad?as=${ID.liis}&tone=helper` },
      { label: "Peeter Org", src: `/taitjad?as=${ID.peeter}&tone=helper` },
    ],
  },
  {
    title: "Lähedane",
    bezel: "#4a3424",
    label: "#f0d7bf",
    radius: "1.15rem",
    inner: "0.7rem",
    width: "24rem",
    padding: "1.05rem 0.4rem 0.55rem",
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
      { label: "Eva Sots", src: `/admin?as=${ID.eva}&tone=admin` },
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
    <main className="flex min-h-dvh flex-col bg-[#1c1915] px-3 py-3 text-white max-lg:pb-16 lg:overflow-hidden lg:px-4 xl:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Uppis</h1>
          <p className="text-sm text-white/80">Kiire abi, kui kukkusid kodus</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {askPin && !PUBLIC_PIN ? (
            <input
              className="min-h-10 w-24 rounded-lg border border-white/40 bg-[#1c1915] px-2 text-sm"
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
            className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold text-[#1c1915] disabled:opacity-60"
            type="button"
            disabled={sending}
            onClick={() => void resetDemo()}
          >
            {confirming ? "Kinnita lähtestamine" : "Lähtesta demo"}
          </button>
          <Link className="min-h-10 rounded-xl border border-white/40 px-3 py-2 text-sm font-bold" href="/valik">
            Ava eraldi
          </Link>
        </div>
      </header>
      {error ? <p className="mt-2 text-sm font-semibold text-[#ffb4b4]">{error}</p> : null}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 items-start lg:grid-cols-3 lg:gap-3 xl:gap-6">
        {PHONES.map((phone, index) => {
          const viewer = phone.viewers[picked[index]] ?? phone.viewers[0];
          return (
            <section
              key={phone.title}
              className={`${mobileTab === index ? "flex" : "hidden"} min-w-0 flex-col items-center lg:flex`}
            >
              <h2 className="hidden text-lg font-extrabold leading-tight lg:block" style={{ color: phone.label }}>
                {phone.title}
              </h2>
              <label className="mt-1 text-xs text-white/80" htmlFor={`viewer-${index}`}>
                Vaata kui…
                <select
                  id={`viewer-${index}`}
                  className="mt-1 block max-w-full rounded-lg border border-white/30 bg-[#1c1915] px-2 py-1 text-sm text-white"
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
                className="relative mt-2 w-full max-lg:h-[calc(100dvh-9rem)] lg:h-[min(78dvh,780px)] lg:max-w-[300px] lg:bg-[var(--phone-bezel)] lg:p-[var(--phone-pad)] lg:shadow-[0_24px_60px_rgba(0,0,0,0.45)] xl:max-w-[var(--phone-width)]"
                style={{
                  ["--phone-width" as string]: phone.width,
                  ["--phone-bezel" as string]: phone.bezel,
                  ["--phone-pad" as string]: phone.padding,
                  borderRadius: undefined,
                }}
              >
                <div
                  className="absolute inset-0 hidden lg:block"
                  style={{ borderRadius: phone.radius, background: phone.bezel }}
                />
                <div className="absolute left-1/2 top-2 z-10 hidden h-3 w-16 -translate-x-1/2 rounded-full bg-black/75 lg:block" />
                <iframe
                  key={`${generation}-${viewer.src}`}
                  title={`${phone.title}, ${viewer.label}`}
                  src={viewer.src}
                  className="relative z-10 h-full w-full border-0 bg-[#f3efe6] lg:rounded-[var(--phone-inner)]"
                  style={{ ["--phone-inner" as string]: phone.inner, borderRadius: undefined }}
                />
                <div className="absolute bottom-2 left-1/2 z-10 hidden h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/35 lg:block" />
              </div>
            </section>
          );
        })}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-3 lg:hidden" aria-label="Vaated">
        {PHONES.map((phone, index) => (
          <button
            key={phone.title}
            className={`text-base font-bold ${mobileTab === index ? "bg-[#0c6b52] text-white" : "bg-[#2a2622] text-white/80"}`}
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
