const STATUS_LABELS: Record<string, string> = {
  open: "Ootel",
  escalated_112: "Suunatud 112-le",
  helper_on_way: "Täitja teel",
  resolved: "Lõpetatud",
  cancelled: "Tühistatud",
};

const OUTCOME_LABELS: Record<string, string> = {
  helped_up: "Aitas püsti",
  called_112: "Kutsus 112",
  other: "Muu",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function outcomeLabel(outcome: string | null): string {
  if (!outcome) return "";
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function formatWhen(value: string): string {
  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
