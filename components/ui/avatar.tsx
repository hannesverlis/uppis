const SIZE = { 32: "h-8 w-8 text-xs", 40: "h-10 w-10 text-sm", 56: "h-14 w-14 text-xl" } as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

export function Avatar({ name, size = 40 }: { name: string; size?: keyof typeof SIZE }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-brand-soft font-bold text-brand ${SIZE[size]}`}
      style={{ borderRadius: "var(--radius-icon)" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
