/** Perk icons and colours. Plain module (no 'use client') so server and client components can both use the values. */
export const ACCENTS: Record<string, { tile: string; ink: string }> = {
  lime: { tile: '#EEFFB3', ink: '#016737' }, coral: { tile: '#FBEFE9', ink: '#D97757' }, river: { tile: '#DCE8FB', ink: '#1D5FD1' },
  harvest: { tile: '#FFF1CC', ink: '#8A5A00' }, leaf: { tile: '#DDF6E3', ink: '#016737' }, ink: { tile: '#E8ECDD', ink: '#0A2015' },
};

/** Line icons for perks. "burst" is a hand-drawn starburst. */
export function PerkIcon({ icon, accent = 'lime', size = 44 }: { icon: string; accent?: string; size?: number }) {
  const c = (ACCENTS[accent] ?? ACCENTS.lime).ink;
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (icon) {
    case 'burst': {
      const rays = [0, 31, 58, 92, 118, 151, 179, 209, 241, 268, 301, 329];
      const len = [9.5, 8, 10, 8.5, 9.8, 7.8, 9.2, 8.4, 10, 8, 9.4, 8.6];
      return <svg {...p} strokeWidth={2.6}>{rays.map((a, i) => { const r = (a * Math.PI) / 180; return <line key={a} x1="12" y1="12" x2={(12 + Math.cos(r) * len[i]).toFixed(2)} y2={(12 + Math.sin(r) * len[i]).toFixed(2)} />; })}</svg>;
    }
    case 'book': return <svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /><path d="M9 8h7M9 11h5" /></svg>;
    case 'ticket': return <svg {...p}><path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z" /><path d="M14 6v12" strokeDasharray="2 2.4" /></svg>;
    case 'chat': return <svg {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></svg>;
    case 'laptop': return <svg {...p}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>;
    case 'cup': return <svg {...p}><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 3v2M11 3v2" /></svg>;
    case 'star': return <svg {...p}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>;
    default: return <svg {...p}><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M12 8v13M3 12h18" /><path d="M12 8C10 4 6 4 6 6.5S9.5 8 12 8c2.5 0 6-.5 6-1.5S14 4 12 8z" /></svg>;
  }
}

