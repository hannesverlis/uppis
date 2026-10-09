"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useSessionUserId } from "./app-shell";

type ClientCard = {
  id: string;
  name: string;
  address: string;
  municipalityName: string;
  relation: string;
  canCall: boolean;
  canEdit: boolean;
};

export function ClientsList() {
  const router = useRouter();
  const userId = useSessionUserId();
  const [clients, setClients] = useState<ClientCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<ClientCard[]>("/api/clients")
      .then((data) => {
        if (!cancelled) {
          setClients(data);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setClients([]);
        setError(reason instanceof ApiRequestError ? reason.message : "Kliente ei saanud laadida.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onlyElder = clients?.length === 1 && clients[0].canCall && !clients[0].canEdit;

  useEffect(() => {
    if (onlyElder && clients?.[0]) {
      router.replace(`/kliendid/${clients[0].id}/abi`);
    }
  }, [clients, onlyElder, router]);

  if (error) {
    return <p className="text-xl font-semibold text-[#9f1d1d]">{error}</p>;
  }
  if (!clients || onlyElder) {
    return <p className="text-xl">Laen kliente…</p>;
  }
  if (clients.length === 0) {
    return (
      <main>
        <h1 className="text-3xl font-extrabold">Kliendid</h1>
        <p className="mt-3 text-xl">Sellel kasutajal pole kliente.</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-3xl font-extrabold">Kliendid</h1>
      <div className="mt-4 flex flex-col gap-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={client.canCall && !client.canEdit ? `/kliendid/${client.id}/abi` : `/kliendid/${client.id}`}
            className="block rounded-2xl bg-white px-5 py-4"
          >
            <span className="block text-2xl font-extrabold">{client.name}</span>
            <span className="mt-1 block text-xl">{client.address}</span>
            <span className="mt-1 block text-base">
              {client.municipalityName}
              {client.relation ? ` · ${client.relation}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
