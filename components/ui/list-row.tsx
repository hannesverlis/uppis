import type { ReactNode } from "react";

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const className = "flex min-h-14 w-full items-center gap-3 border-b border-border py-2 text-left last:border-b-0";
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {subtitle ? <span className="block text-sm text-ink-muted">{subtitle}</span> : null}
      </span>
      {trailing}
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}
