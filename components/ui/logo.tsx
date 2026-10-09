const SRC = {
  light: "/brand/uppis-logo.svg",
  dark: "/brand/uppis-logo-dark.svg",
  icon: "/brand/uppis-icon.svg",
} as const;

export function Logo({ variant = "light", height = 32 }: { variant?: keyof typeof SRC; height?: number }) {
  return (
    <img
      src={SRC[variant]}
      alt="Uppis"
      height={height}
      style={{ height, width: variant === "icon" ? height : "auto" }}
    />
  );
}
