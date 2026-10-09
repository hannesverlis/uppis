import type { ReactNode } from "react";

export function BottomSheet({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`sheet-rise fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] rounded-t-sheet bg-bg px-5 pt-3 shadow-sheet pb-[max(1.25rem,env(safe-area-inset-bottom))] ${className}`}
    >
      <div className="mx-auto mb-4 h-1 w-9 rounded-pill bg-border" />
      {children}
    </section>
  );
}
