"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useSessionUserId } from "./app-shell";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type Session = {
  me: { id: string; roles: string[] } | null;
};

export function AdminReset() {
  const userId = useSessionUserId();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
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
      await api("/api/admin/reset", { method: "POST" });
      setDone("Demo andmed taastatud");
      setConfirming(false);
      router.refresh();
    } catch (reason: unknown) {
      setError(reason instanceof ApiRequestError ? reason.message : "Lähtestamine ebaõnnestus.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mt-4">
      <h2 className="text-base font-bold">Demo lähtestamine</h2>
      <Button className="mt-3" variant="danger" size="admin" disabled={sending} onClick={resetDemo}>
        {confirming ? "Kinnita lähtestamine" : "Lähtesta demo"}
      </Button>
      {done ? <p className="mt-3 text-base font-semibold">{done}</p> : null}
      {error ? <p className="mt-3 text-base font-semibold text-danger">{error}</p> : null}
    </Card>
  );
}
