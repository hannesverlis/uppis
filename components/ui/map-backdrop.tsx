import { Avatar } from "./avatar";

export function MapBackdrop({
  helperName,
  searching = false,
  className = "h-[52dvh]",
}: {
  helperName?: string | null;
  searching?: boolean;
  className?: string;
}) {
  const onWay = Boolean(helperName);

  return (
    <div className={`relative overflow-hidden bg-[#eef1f3] ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="320" fill="#eef1f3" />
        <path d="M40 40h140v90H40z" fill="var(--color-brand-soft)" />
        <path d="M-20 90 H420" stroke="#ffffff" strokeWidth="18" />
        <path d="M-20 210 H420" stroke="#ffffff" strokeWidth="14" />
        <path d="M120 -20 V340" stroke="#ffffff" strokeWidth="16" />
        <path d="M280 -20 V340" stroke="#ffffff" strokeWidth="12" />
        <path d="M0 0 L180 320" stroke="#ffffff" strokeWidth="10" />
        {onWay ? (
          <line
            x1="150"
            y1="110"
            x2="230"
            y2="190"
            stroke="var(--color-brand-accent)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        ) : null}
      </svg>
      {onWay && helperName ? (
        <div className="absolute left-[30%] top-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[24%] border-4 border-white shadow-card">
          <Avatar name={helperName} size={40} />
        </div>
      ) : null}
      <div className={`absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 ${searching ? "scale-110" : ""}`}>
        <span className={`map-pulse absolute inset-0 rounded-[24%] bg-brand-accent/20 ${searching ? "scale-150" : ""}`} />
        <span className="map-pulse map-pulse-delay absolute inset-0 rounded-[24%] bg-brand-accent/20" />
        <span className="relative flex h-14 w-14 items-center justify-center bg-white shadow-card" style={{ borderRadius: "var(--radius-icon)" }}>
          <img src="/brand/uppis-mark.svg" alt="" width={40} height={40} />
        </span>
      </div>
    </div>
  );
}
