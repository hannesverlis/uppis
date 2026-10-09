"use client";

import { useEffect, useState } from "react";

function clock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const text = [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  return hours > 0 ? `${hours}:${text}` : text;
}

export function isArrivalLate(from: string, minutes: number, now = Date.now()) {
  return now > new Date(from).getTime() + minutes * 60 * 1000;
}

export function ArrivalClock({ from, minutes, large = false }: { from: string; minutes: number; large?: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const end = new Date(from).getTime() + minutes * 60 * 1000;
  const delta = Math.floor((end - now) / 1000);
  const late = delta < 0;

  return (
    <p className={`font-extrabold tabular-nums ${large ? "text-[56px] leading-none" : "text-4xl"} ${late ? "text-danger" : "text-brand"}`} aria-live="polite">
      {late ? `Hilineb +${clock(-delta)}` : clock(delta)}
    </p>
  );
}
