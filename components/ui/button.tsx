import type { ButtonHTMLAttributes } from "react";

const VARIANT = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-hover",
  secondary: "bg-surface text-ink",
  danger: "bg-danger text-white",
  ghost: "bg-transparent text-brand underline-offset-4 hover:underline",
} as const;

const SIZE = {
  admin: "min-h-12 text-base",
  md: "min-h-14 text-lg",
  elder: "min-h-16 text-xl",
  tall: "min-h-[72px] text-[22px]",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
}) {
  return (
    <button
      type={type}
      className={`inline-flex w-full items-center justify-center gap-3 rounded-pill px-5 font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/40 active:scale-[0.98] disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
}
