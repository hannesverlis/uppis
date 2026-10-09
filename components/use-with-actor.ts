"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useSessionUserId } from "./app-shell";
import { withActor } from "./actor-link";

export function useWithActor() {
  const sessionActor = useSessionUserId();
  const params = useSearchParams();
  const actor = params.get("as") || sessionActor;
  const tone = params.get("tone");
  return useCallback((href: string) => withActor(href, actor, tone), [actor, tone]);
}
