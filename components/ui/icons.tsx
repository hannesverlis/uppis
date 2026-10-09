type IconProps = { className?: string };

export function MarkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M27 38 V56 a23 23 0 0 0 46 0 V38"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="50" cy="31" r="8" fill="none" stroke="currentColor" strokeWidth="8" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14A1.5 1.5 0 0 1 16 20.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 17.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M5 12.5 9.5 17 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeakerIcon({ muted, className }: IconProps & { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 10v4h3l4 3V7L7 10H4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
