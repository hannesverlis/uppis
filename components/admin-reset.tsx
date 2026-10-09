"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useSessionUserId } from "./app-shell";

type Session = {
  me: { id: string; roles: string[] } | null;
};

export function AdminReset() {
  const userId = useSessionUserId();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Session>("/api/bootstrap")
      .then((data) => {
        if (!cancelled) setAllowed(Boolean(data.me?.roles.includes("admin_system")));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!allowed) return null;

  async function resetDemo() {
    if (!confirming) {
      setConfirming(true);
      setError("");
      setDone("");
      return;
    }
    setSending(true);
    setError("");
    setDone("");
    try {
      await api("/api/admin/pin", { method: "POST", body: JSON.stringify({ pin }) });
      await api("/api/admin/reset", { method: "POST" });
      setDone("Demo andmed taastatud");
      setConfirming(false);
      setPin("");
      router.refresh();
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Lähtestamine ebaõnnestus.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl bg-white px-5 py-4">
      <h2 className="text-2xl font-extrabold">Demo lähtestamine</h2>
      <label className="mt-4 block text-base font-semibold" htmlFor="admin-pin">
        PIN
      </label>
      <input
        id="admin-pin"
        className="mt-2 min-h-16 w-full rounded-2xl border-2 border-[#1c1915] bg-white px-3 text-xl"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(event) => {
          setPin(event.target.value);
          setConfirming(false);
        }}
      />
      <button
        className="mt-4 min-h-16 w-full rounded-2xl bg-[#6b3a1f] px-5 text-xl font-bold text-white disabled:opacity-60"
        type="button"
        disabled={sending || pin.trim().length === 0}
        onClick={resetDemo}
      >
        {confirming ? "Kinnita lähtestamine" : "Lähtesta demo"}
      </button>
      {done ? <p className="mt-3 text-xl font-semibold">{done}</p> : null}
      {error ? <p className="mt-3 text-xl font-semibold text-[#9f1d1d]">{error}</p> : null}
    </section>
  );
}
