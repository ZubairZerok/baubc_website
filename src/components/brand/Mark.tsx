/**
 * BAUBC brand geometry, traced from the club logo (1000 × 1000 grid).
 * Six rays burst from one point: five bars and one diamond (the spark).
 * Everything visual on the site is derived from these shapes and their 45° angle.
 */
export const RAYS = [
  { id: 'r1', d: 'M292 250 382 161 541 321 545 363H405Z', dx: -1, dy: -1 },
  { id: 'r2', d: 'M667 271 760 364 675 450 581 357Z', dx: 1, dy: -1 },
  { id: 'r3', d: 'M191 387H545L421 514H191Z', dx: -1, dy: 0 },
  { id: 'r4', d: 'M545 387 549 492 640 489 353 773 260 680Z', dx: -1, dy: 1 },
  { id: 'r5', d: 'M640 489V838H517V609Z', dx: 0, dy: 1 },
  { id: 'r6', d: 'M665 488 708 486 871 648 782 737 665 620Z', dx: 1, dy: 1 },
] as const;

/** The whole mark as one path (no seams). */
export const MARK_PATH =
  'M292 250 382 161 541 321 545 363H405ZM667 271 760 364 675 450 581 357ZM191 387H545L549 492 640 489V838H517V609L353 773 260 680 424 514H191ZM665 488 708 486 871 648 782 737 665 620Z';

/** Focal point the rays burst from. */
export const FOCUS = { x: 590, y: 436 };

export function Mark({ size = 32, className = '', title }: { size?: number | string; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="150 120 760 760" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={MARK_PATH} />
    </svg>
  );
}

/** The logo as it appears on the club's page: white mark on a green tile. */
export function LogoTile({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1000 1000" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="1000" height="1000" rx="230" fill="#016737" />
      <path d={MARK_PATH} fill="#fff" />
    </svg>
  );
}

export function Diamond({ size = 10, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" className={`shrink-0 ${className}`} fill="currentColor" aria-hidden="true">
      <path d="M5 0l5 5-5 5-5-5z" />
    </svg>
  );
}

/** Up-right arrow: the direction the spark travels in the logo. */
export function Arrow({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className={`arr shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
      <path d="M3 11 11 3M5 3h6v6" />
    </svg>
  );
}

/** Large decorative mark, cropped by its container. */
export function MarkBackdrop({ className = '', rotate = 0 }: { className?: string; rotate?: 0 | 90 | 180 | 270 }) {
  return (
    <svg viewBox="150 120 760 760" className={`pointer-events-none absolute ${className}`} fill="currentColor" aria-hidden="true" style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
      <path d={MARK_PATH} />
    </svg>
  );
}
