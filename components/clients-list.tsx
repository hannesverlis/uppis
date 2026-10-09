"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";
import { useEmbedded, usePageTitle, useSessionUserId } from "./app-shell";
import { useWithActor } from "./use-with-actor";
import { Avatar } from "./ui/avatar";
import { ChevronIcon } from "./ui/icons";
import { ListRow } from "./ui/list-row";

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
  const embedded = useEmbedded();
  const withActor = useWithActor();
  const [clients, setClients] = useState<ClientCard[] | null>(null);
  const [error, setError] = useState("");
  usePageTitle("Kliendid");

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
      router.replace(withActor(`/kliendid/${clients[0].id}/abi`));
    }
  }, [clients, onlyElder, router, withActor]);

  if (error) {
    return <p className="text-xl font-semibold text-danger">{error}</p>;
  }
  if (!clients || onlyElder) {
    return <p className="text-xl">Laen kliente…</p>;
  }
  if (clients.length === 0) {
    return (
      <main>
        {embedded ? <h1 className="text-2xl font-bold">Kliendid</h1> : null}
        <p className="mt-3 text-xl">Sellel kasutajal pole kliente.</p>
      </main>
    );
  }

  return (
    <main>
      {embedded ? <h1 className="mb-2 text-2xl font-bold">Kliendid</h1> : null}
      <div>
        {clients.map((client) => (
          <Link
            key={client.id}
            href={withActor(
              client.canCall && !client.canEdit ? `/kliendid/${client.id}/abi` : `/kliendid/${client.id}`,
            )}
            className="block"
          >
            <ListRow
              leading={<Avatar name={client.name} size={40} />}
              title={client.name}
              subtitle={`${client.address} · ${client.municipalityName}${client.relation ? ` · ${client.relation}` : ""}`}
              trailing={<ChevronIcon className="h-5 w-5 text-ink-muted" />}
            />
          </Link>
        ))}
      </div>
    </main>
  );
}
