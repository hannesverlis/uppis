import type { Clip } from "./voice";

type Heard = { id: string; status: string; late: boolean };
type Next = Heard & { etaMin: number | null };

function etaClip(minutes: number | null): Clip | null {
  if (minutes === 5 || minutes === 10 || minutes === 20 || minutes === 40) return `abi-teel-${minutes}`;
  return null;
}

export function clipFor(prev: Heard | null, next: Next | null): Clip | null {
  if (!next || !prev || prev.id !== next.id) return null;
  if (prev.status === "open" && next.status === "helper_on_way") return etaClip(next.etaMin);
  if (prev.status === "helper_on_way" && next.status === "helper_arrived") return "abistaja-kohal";
  if (next.status === "helper_on_way" && next.late && !prev.late) return "abistaja-hilineb";
  return null;
}
