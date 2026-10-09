import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  fresh = false,
}: {
  children: ReactNode;
  className?: string;
  fresh?: boolean;
}) {
  return (
    <article className={`relative rounded-card border border-border bg-bg p-4 shadow-card ${fresh ? "card-in" : ""} ${className}`}>
      {fresh ? <span className="card-flash pointer-events-none absolute inset-0 rounded-card" /> : null}
      {children}
    </article>
  );
}
