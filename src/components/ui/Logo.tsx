export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <path d="M11 43c9-2 13-14 21-14s9 7 21-14" stroke="var(--signal)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M11 52h42" stroke="var(--paper)" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
