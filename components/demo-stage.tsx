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

export function DemoStage() {
  const [picked, setPicked] = useState(() => PHONES.map(() => 0));

  return (
    <main className="flex min-h-dvh flex-col bg-[#1c1915] px-6 py-3 text-white">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Uppis</h1>
          <p className="text-sm text-white/80">Kolm vaadet korraga. Vasakul kutsub abi, keskel võtab vastu.</p>
        </div>
        <Link className="text-sm font-bold text-white underline" href="/valik">
          Valik
        </Link>
      </header>
      <div className="mt-2 grid flex-1 grid-cols-3 items-start gap-6">
        {PHONES.map((phone, index) => {
          const viewer = phone.viewers[picked[index]] ?? phone.viewers[0];
          return (
            <section key={phone.title} className="flex min-w-0 flex-col items-center">
              <h2 className="text-lg font-extrabold leading-tight" style={{ color: phone.label }}>
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
                className="relative mt-2 w-full shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                style={{
                  maxWidth: phone.width,
                  height: "min(72dvh, 760px)",
                  background: phone.bezel,
                  borderRadius: phone.radius,
                  padding: phone.padding,
                }}
              >
                <div className="absolute left-1/2 top-2 h-3 w-16 -translate-x-1/2 rounded-full bg-black/75" />
                <iframe
                  title={`${phone.title}, ${viewer.label}`}
                  src={viewer.src}
                  className="h-full w-full border-0 bg-[#f3efe6]"
                  style={{ borderRadius: phone.inner }}
                />
                <div className="absolute bottom-2 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/35" />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
