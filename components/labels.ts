const STATUS_LABELS: Record<string, string> = {
  open: "Ootel",
  escalated_112: "Suunatud 112-le",
  helper_on_way: "Täitja teel",
  helper_arrived: "Abistaja on kohal",
  resolved: "Lõpetatud",
  cancelled: "Tühistatud",
};

const KOV_STATUS_LABELS: Record<string, string> = {
  new: "Uus",
  in_progress: "Võetud menetlusse",
  done: "Menetletud",
};

const OUTCOME_LABELS: Record<string, string> = {
  helped_up: "Aitas püsti",
  called_112: "Kutsus 112",
  other: "Muu",
};

export const CLOSE_OPTIONS = [
  { outcome: "helped_up", label: "Aitasin üles" },
  { outcome: "called_112", label: "Helistasin 112" },
  { outcome: "other", label: "Muu" },
] as const;

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function kovStatusLabel(status: string): string {
  return KOV_STATUS_LABELS[status] ?? status;
}

export function outcomeLabel(outcome: string | null): string {
  if (!outcome) return "";
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function formatClock(value: string): string {
  return new Intl.DateTimeFormat("et-EE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWhen(value: string): string {
  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
