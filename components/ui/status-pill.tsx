const STYLE: Record<string, string> = {
  open: "bg-warning-soft text-warning-ink",
  helper_on_way: "bg-brand-soft text-brand",
  helper_arrived: "bg-brand text-white",
  resolved: "bg-surface text-ink-muted",
  cancelled: "bg-surface text-ink-muted",
  escalated_112: "bg-danger-soft text-danger",
};

const LABEL: Record<string, string> = {
  open: "Otsime abistajat",
  helper_on_way: "Teel",
  helper_arrived: "Kohal",
  resolved: "Lõpetatud",
  cancelled: "Tühistatud",
  escalated_112: "112",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-sm font-semibold ${STYLE[status] ?? "bg-surface text-ink-muted"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? LABEL[status] ?? status}
    </span>
  );
}
